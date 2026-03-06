# Openclaw2

Polymarket copy-trading stack (backend worker + dashboard). Work in progress.

## Structure

- `backend/` – FastAPI worker exposing wallet summaries + mirroring primitives.
- `dashboard/` – Next.js (App Router + Tailwind) control panel for monitoring wallets.

## Local dev

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# dashboard
cd dashboard
cp .env.local.example .env.local
npm install
npm run dev
```
