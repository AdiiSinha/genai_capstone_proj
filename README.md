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
Do not commit secrets to Git.
