"""RAG-backed office lookup with Maps-based location filtering."""

from __future__ import annotations

import html
import logging
import math
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
import urllib3
from dotenv import load_dotenv

from services.custom_embeddings import CGGenerativeEngineEmbeddings

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()
logger = logging.getLogger(__name__)


class OfficeRAGError(RuntimeError):
    """Raised when office indexing or lookup cannot complete safely."""


@dataclass(frozen=True)
class Office:
    name: str
    city: str
    state: str
    latitude: float
    longitude: float
    address: str = ""

    @property
    def document(self) -> str:
        return f"{self.name}, {self.address or self.city}, {self.state}"


def haversine_km(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    """Return the great-circle distance between two WGS84 coordinates."""
    radius_km = 6371.0088
    lat_a, lat_b = math.radians(latitude_a), math.radians(latitude_b)
    delta_lat = math.radians(latitude_b - latitude_a)
    delta_lon = math.radians(longitude_b - longitude_a)
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    return radius_km * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


class OfficeRAG:
    """Load office records once, index them, and serve nearest-office queries."""

    def __init__(self) -> None:
        self.pdf_path = Path(os.getenv("OFFICE_LOCATIONS_PDF", "data/office_locations.pdf"))
        self.chroma_path = os.getenv("OFFICE_CHROMA_PATH", "data/chroma_offices")
        self.base_url = os.getenv("GENAI_BASE_URL", "https://openai.generative-eu.engine.capgemini.com/v1")
        self.embedding_url = self.base_url.rstrip("/") + "/embeddings"
        self.embedding_model = os.getenv("GENAI_EMBEDDING_MODEL", "amazon.titan-embed-text-v2:0")
        self.genai_key = os.getenv("GENAI_API_KEY", "")
        self.osm_url = os.getenv("OSM_NOMINATIM_URL", "https://nominatim.openstreetmap.org/reverse")
        self.osm_user_agent = os.getenv("OSM_USER_AGENT", "workday-copilot-office-rag/1.0")
        self.collection: Any = None
        self._indexed = False
        self.offices: list[Office] = []
        self._vector_indexed: bool = False
        self.embedding_client: CGGenerativeEngineEmbeddings | None = None
        if self.genai_key:
            self.embedding_client = CGGenerativeEngineEmbeddings(
                api_key=self.genai_key,
                model=self.embedding_model,
                base_url=self.base_url,
                max_workers=5,
                retry_attempts=3,
                retry_delay=1.0,
                timeout=30,
            )

    def _embed(self, texts: list[str]) -> list[list[float]]:
        if not self.genai_key or not os.getenv("GENAI_BASE_URL"):
            raise OfficeRAGError("Embedding service is not configured. Set GENAI_API_KEY and GENAI_BASE_URL.")
        if not self.embedding_client:
            self.embedding_client = CGGenerativeEngineEmbeddings(
                api_key=self.genai_key,
                model=self.embedding_model,
                base_url=self.base_url,
                max_workers=5,
                retry_attempts=3,
                retry_delay=1.0,
                timeout=30,
            )
        try:
            return self.embedding_client.embed_documents(texts)
        except OfficeRAGError:
            raise
        except Exception as exc:
            logger.exception("Embedding request failed: %s", exc)
            raise OfficeRAGError(f"Embedding service failed: {exc}") from exc

    @staticmethod
    def _pdf_text(path: Path) -> str:
        try:
            from pypdf import PdfReader
            return "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
        except ImportError as exc:
            raise OfficeRAGError("PDF support is missing. Install backend requirements.") from exc
        except Exception as exc:
            logger.exception("Could not read office PDF: %s", path)
            raise OfficeRAGError("The office locations PDF could not be read.") from exc

    @staticmethod
    def _parse_rows(rows: list[list[Any]]) -> list[Office]:
        """Convert table rows after the header into validated Office records."""
        offices: list[Office] = []
        for fields in rows:
            fields = ["" if value is None else str(value).strip() for value in fields]
            if len(fields) < 5:
                continue
            try:
                latitude, longitude = float(fields[3]), float(fields[4])
            except ValueError:
                continue
            if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                offices.append(Office(fields[0], fields[1], fields[2], latitude, longitude, fields[5] if len(fields) > 5 else ""))
        if not offices:
            raise OfficeRAGError("No valid office rows found after table validation.")
        return offices

    @staticmethod
    def _normalise_column(value: Any) -> str:
        """Make PDF headers comparable despite whitespace, line breaks, and symbols."""
        return re.sub(r"[^a-z0-9]", "", str(value or "").replace("\n", " ").strip().casefold())

    @classmethod
    def _extract_offices(cls, path: Path) -> list[Office]:
        """Extract visible tables first, then fall back to pipe-delimited text."""
        logger.info("Loading office-location PDF: %s", path)
        try:
            import pandas as pd
            import pdfplumber

            tables: list[list[list[Any]]] = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    tables.extend(page.extract_tables() or [])
            logger.info("PDF loaded successfully: %s (%d table(s) found)", path, len(tables))
            for table in tables:
                if not table:
                    continue
                raw = pd.DataFrame(table[1:], columns=table[0])
                logger.info("Raw extracted office dataframe before validation:\n%s", raw.to_string(index=False))
                logger.info("Extracted %d office table rows before validation", len(raw.index))
                columns = {cls._normalise_column(column): column for column in raw.columns}
                required = {"name": "name", "city": "city", "state": "state", "latitude": "latitude", "longitude": "longitude"}
                if not all(key in columns for key in required):
                    logger.warning("Skipping table with unrecognized columns: %s", list(raw.columns))
                    continue
                selected = [[row.get(columns[key], "") for key in required] + [row.get(columns.get("address", ""), "") if "address" in columns else ""] for _, row in raw.iterrows()]
                offices = cls._parse_rows(selected)
                logger.info("Validated %d office rows from %s", len(offices), path)
                return offices
        except ImportError as exc:
            raise OfficeRAGError("PDF table support is missing. Install backend requirements.") from exc
        except Exception:
            logger.exception("Table extraction failed for %s; trying text fallback", path)

        text_rows = [line.split("|") for line in cls._pdf_text(path).splitlines() if "|" in line]
        logger.info("Raw pipe-delimited office rows before validation: %s", text_rows)
        logger.info("Extracted %d office rows before validation", max(len(text_rows) - 1, 0))
        return cls._parse_rows(text_rows[1:] if text_rows and cls._normalise_column(text_rows[0][0]) == "name" else text_rows)

    def _load_collection(self) -> Any:
        if self.collection is not None:
            return self.collection
        try:
            import chromadb
            client = chromadb.PersistentClient(path=self.chroma_path)
            self.collection = client.get_or_create_collection("office_locations")
            return self.collection
        except ImportError as exc:
            raise OfficeRAGError("Vector database support is missing. Install backend requirements.") from exc
        except Exception as exc:
            logger.warning("Could not open Chroma vector database: %s", exc)
            raise OfficeRAGError("The office vector database could not be opened.") from exc

    def ensure_indexed(self) -> None:
        if self._indexed:
            return
        if not self.pdf_path.exists():
            raise OfficeRAGError(f"Office locations PDF not found: {self.pdf_path}")
        self.offices = self._extract_offices(self.pdf_path)
        try:
            collection = self._load_collection()
            if collection.count() != len(self.offices):
                embeddings = self._embed([office.document for office in self.offices])
                collection.upsert(
                    ids=[f"office-{index}" for index in range(len(self.offices))],
                    documents=[office.document for office in self.offices],
                    metadatas=[office.__dict__ for office in self.offices],
                    embeddings=embeddings,
                )
                logger.info("Indexed %d office locations from %s", len(self.offices), self.pdf_path)
            self._vector_indexed = True
        except Exception as exc:
            logger.warning("Vector database indexing unavailable (%s). Falling back to direct PDF-based office lookup.", exc)
            self._vector_indexed = False
        self._indexed = True

    def reverse_geocode(self, latitude: float, longitude: float) -> dict[str, Any]:
        """Resolve a browser coordinate to a state using OpenStreetMap Nominatim."""
        try:
            try:
                response = requests.get(
                    self.osm_url,
                    params={"lat": latitude, "lon": longitude, "format": "jsonv2", "zoom": 10},
                    headers={"User-Agent": self.osm_user_agent},
                    timeout=5,
                )
            except requests.exceptions.SSLError:
                response = requests.get(
                    self.osm_url,
                    params={"lat": latitude, "lon": longitude, "format": "jsonv2", "zoom": 10},
                    headers={"User-Agent": self.osm_user_agent},
                    timeout=5,
                    verify=False,
                )
            response.raise_for_status()
            address = response.json().get("address", {})
            state = address.get("state") or address.get("state_district") or ""
            return {"latitude": latitude, "longitude": longitude, "state": state}
        except Exception as exc:
            logger.warning("OpenStreetMap reverse geocoding unavailable (%s); proceeding with coordinate-based distance.", exc)
            return {"latitude": latitude, "longitude": longitude, "state": ""}

    def search(self, query: str = "office", location: dict[str, Any] | None = None, limit: int = 5) -> dict[str, Any]:
        self.ensure_indexed()

        candidates = self.offices or []
        if self._vector_indexed:
            try:
                collection = self._load_collection()
                query_vec = self.embedding_client.embed_query(query) if self.embedding_client else self._embed([query])[0]
                result = collection.query(query_embeddings=[query_vec], n_results=max(collection.count(), 1), include=["metadatas"])
                if result.get("metadatas") and result["metadatas"][0]:
                    candidates = [Office(**metadata) for metadata in result["metadatas"][0]]
            except Exception as exc:
                logger.warning("Vector search query failed (%s); using parsed office records.", exc)
                candidates = self.offices or []

        if not location:
            top = (candidates or self.offices)[:limit]
            rows = [
                {
                    "name": o.name,
                    "city": o.city,
                    "state": o.state,
                    "address": o.address,
                    "latitude": o.latitude,
                    "longitude": o.longitude,
                    "distance_km": 0.0,
                }
                for o in top
            ]
            return {
                "html": "<br>".join(f"{html.escape(row['name'])} ({html.escape(row['city'])}, {html.escape(row['state'])})" for row in rows),
                "offices": rows,
                "user_state": "",
                "user_latitude": None,
                "user_longitude": None,
                "fallback_all_states": True,
            }

        user_location = location
        try:
            latitude = float(user_location.get("latitude") if user_location.get("latitude") is not None else 0.0)
            longitude = float(user_location.get("longitude") if user_location.get("longitude") is not None else 0.0)
        except (TypeError, ValueError):
            latitude, longitude = 0.0, 0.0

        if not str(user_location.get("state", "")).strip():
            user_location = self.reverse_geocode(latitude, longitude)
        state = str(user_location.get("state", "")).strip().casefold()

        same_state = [office for office in candidates if state and office.state.casefold() == state]
        ranked = sorted(same_state or candidates, key=lambda office: haversine_km(latitude, longitude, office.latitude, office.longitude))[:limit]
        rows = [
            {
                "name": office.name,
                "city": office.city,
                "state": office.state,
                "address": office.address,
                "latitude": office.latitude,
                "longitude": office.longitude,
                "distance_km": round(haversine_km(latitude, longitude, office.latitude, office.longitude), 2),
            }
            for office in ranked
        ]
        return {
            "html": "<br>".join(f"{html.escape(row['name'])} ({html.escape(row['city'])}, {html.escape(row['state'])}) - {row['distance_km']:.2f} km" for row in rows),
            "offices": rows,
            "user_state": user_location.get("state", ""),
            "user_latitude": latitude,
            "user_longitude": longitude,
            "fallback_all_states": not same_state,
        }



office_rag = OfficeRAG()

__all__ = [
    "Office",
    "OfficeRAG",
    "OfficeRAGError",
    "office_rag",
    "CGGenerativeEngineEmbeddings",
    "haversine_km",
]