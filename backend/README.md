# Market Doppelganger API

Phase 1 provides the FastAPI foundation and `GET /health`. Market providers are interfaces only; no market data is generated or served yet.

## Local setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```
