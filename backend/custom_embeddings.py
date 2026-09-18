"""Custom embedding implementation for Capgemini Generative Engine Platform."""

from __future__ import annotations

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, List, Optional

import requests

logger = logging.getLogger(__name__)


class CGGenerativeEngineEmbeddings:
    """
    Optimized Custom Embedding Class for Generative Engine Platform.

    Key Improvements:
    - Parallel API calls using ThreadPoolExecutor
    - Retry logic with exponential backoff
    - Request timeout to prevent hanging
    - Order-preserving parallel results
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "amazon.titan-embed-text-v2:0",
        base_url: str = "https://openai.generative-eu.engine.capgemini.com/v1",
        max_workers: int = 5,       # parallel API calls
        retry_attempts: int = 3,    # retries on failure
        retry_delay: float = 1.0,   # base delay between retries
        timeout: int = 30           # seconds before request times out
    ) -> None:
        # ── API Key ──────────────────────────────────────────
        self.api_key = api_key or os.getenv("GENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "❌ API key must be provided or set in GENAI_API_KEY environment variable"
            )

        # ── Config ───────────────────────────────────────────
        self.model = model
        self.base_url = (base_url or os.getenv("GENAI_BASE_URL", "https://openai.generative-eu.engine.capgemini.com/v1")).rstrip("/")
        self.max_workers = max_workers
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.timeout = timeout

        # ── Endpoints ────────────────────────────────────────
        self.embeddings_url = f"{self.base_url}/embeddings"
        self.models_url = f"{self.base_url}/embeddings/models"

        # ── Headers ──────────────────────────────────────────
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        logger.info("Embedding model initialized: %s", self.model)
        logger.info("   Parallel workers : %d", self.max_workers)
        logger.info("   Retry attempts   : %d", self.retry_attempts)
        logger.info("   Request timeout  : %ds", self.timeout)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of documents using parallel API calls.

        Args:
            texts: List of text strings to embed
        Returns:
            List of embedding vectors in the SAME ORDER as input
        """
        if not texts:
            return []

        embeddings: List[Optional[List[float]]] = [None] * len(texts)

        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(texts))) as executor:
            future_to_index = {
                executor.submit(self._create_embedding_with_retry, text): idx
                for idx, text in enumerate(texts)
            }

            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    embeddings[idx] = future.result()
                except Exception as exc:
                    logger.error("Failed to embed chunk at index %d: %s", idx, exc)
                    raise

        return [emb for emb in embeddings if emb is not None]

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query text (used during retrieval).

        Args:
            text: Query string
        Returns:
            Embedding vector as list of floats
        """
        return self._create_embedding_with_retry(text)

    def __call__(self, input: List[str]) -> List[List[float]]:
        """Allow class instance to be directly called as a Chroma embedding function."""
        return self.embed_documents(input)

    def _create_embedding_with_retry(self, text: str) -> List[float]:
        """
        Wraps _create_embedding with retry logic.

        - Handles rate limits (429) with exponential backoff
        - Retries on transient network errors
        - Raises immediately on non-retryable HTTP errors
        """
        last_exception = None

        for attempt in range(self.retry_attempts):
            try:
                return self._create_embedding(text)

            except requests.exceptions.HTTPError as e:
                status = e.response.status_code if e.response is not None else 0

                if status == 429:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.warning(
                        "Rate limited (429). Waiting %.1fs [attempt %d/%d]...",
                        wait_time, attempt + 1, self.retry_attempts
                    )
                    time.sleep(wait_time)

                elif status in [500, 502, 503, 504]:
                    wait_time = self.retry_delay * (attempt + 1)
                    logger.warning(
                        "Server error (%d). Retrying in %.1fs [attempt %d/%d]...",
                        status, wait_time, attempt + 1, self.retry_attempts
                    )
                    time.sleep(wait_time)

                elif status == 403:
                    raise RuntimeError(
                        f"Embedding service denied access (HTTP 403) for model '{self.model}'. "
                        "Ask the GenAI platform team to authorize this model and endpoint for your API key."
                    )

                elif status in [401, 404]:
                    raise RuntimeError(
                        f"Embedding configuration failed (HTTP {status}). Check GENAI_BASE_URL and GENAI_EMBEDDING_MODEL."
                    )

                else:
                    raise RuntimeError(f"Non-retryable HTTP error {status}: {e}")

            except requests.exceptions.Timeout:
                last_exception = RuntimeError(f"Request timed out after {self.timeout}s")
                logger.warning("Timeout on attempt %d/%d. Retrying...", attempt + 1, self.retry_attempts)
                time.sleep(self.retry_delay)

            except requests.exceptions.RequestException as e:
                last_exception = e
                logger.warning("Network error on attempt %d/%d: %s", attempt + 1, self.retry_attempts, e)
                time.sleep(self.retry_delay)

        raise RuntimeError(
            f"All {self.retry_attempts} attempts failed. Last error: {last_exception}"
        )

    def _create_embedding(self, text: str) -> List[float]:
        """Makes a single embedding API call."""
        payload = {
            "input": text,
            "model": self.model
        }

        response = requests.post(
            self.embeddings_url,
            headers=self.headers,
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        result = response.json()
        return result["data"][0]["embedding"]

    def get_available_models(self) -> dict[str, Any]:
        """Fetch all available embedding models from the API."""
        try:
            response = requests.get(
                self.models_url,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Error fetching available models: {e}") from e
