# Workday Copilot — Full UI + AI

A local enterprise-style employee workday copilot prototype.

## Current prototype
- Microsoft login through MSAL / Entra ID
- Microsoft Graph `/me` profile
- Microsoft Graph inbox mail read
- Microsoft Graph calendar read (next 7 days)
- Send mail with human approval
- Save edited replies as Outlook drafts
- Mark mail important
- Flag mail for follow-up
- Synthetic Teams/project/task context
- AI orchestration through the configured OpenAI-compatible `GENAI_*` endpoint
- Local conversation memory (last 40 turns)
- Dynamic AI follow-up suggestions
- Jarvis-style animated orb
- Browser voice input and speech output
- Stop speaking / stop listening controls
- Automatic listening after an AI response (toggleable)
- Employee profile card backed by Graph `/me`
- Workplace pulse, meeting rooms, campus mobility and updates UI
- PDF-backed office RAG lookup with OpenStreetMap location filtering and distance sorting

## Important permissions
For the personal-account prototype, use Microsoft Graph **Delegated** permissions. The current frontend requests:
- User.Read
- Mail.Read
- Mail.ReadWrite
- Mail.Send
- Calendars.Read

`Mail.ReadWrite` is needed for saving drafts, flagging and marking messages important.

Teams is intentionally synthetic for the personal-account prototype. The normalized context model lets a later work/school tenant adapter replace synthetic Teams with authorized Graph data without changing the AI UI.

## Start
### Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
Open a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Frontend .env
```env
VITE_AZURE_CLIENT_ID=YOUR_CLIENT_ID
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/common
VITE_REDIRECT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000
```

## Backend .env
Keep your existing configured `GENAI_API_KEY`, `GENAI_BASE_URL`, and `GENAI_MODEL` values.
For office lookup, also set `GENAI_EMBEDDING_MODEL` and optionally
`OFFICE_LOCATIONS_PDF` (default: `backend/data/office_locations.pdf`) and
`OFFICE_CHROMA_PATH` (default: `backend/data/chroma_offices`). OpenStreetMap Nominatim uses
`OSM_NOMINATIM_URL` and requires a descriptive `OSM_USER_AGENT`. The PDF must contain one
pipe-delimited row per office with this schema:

```text
Name | City | State | Latitude | Longitude | Address
Capgemini Austin | Austin | Texas | 30.2672 | -97.7431 | 123 Main Street
```

Call `POST /api/offices/nearby` with `query`, `limit`, and optionally `latitude`, `longitude`,
and `state`. The frontend obtains coordinates from browser geolocation, then the backend
uses OpenStreetMap Nominatim to resolve the state. The response contains escaped HTML in `html`, structured `offices`, and
`fallback_all_states`; state filtering happens before Haversine sorting, with an all-state
fallback when no office matches.
The embedding model must be enabled for your GenAI API key. A `403` from `/embeddings` is an
identity-policy/platform permission issue, not a PDF or Chroma issue; ask the platform team
for the exact supported embedding model and permission to call the embeddings endpoint.
Do not commit secrets to Git.
