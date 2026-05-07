# Receipt Parser

## What this is
A small full-stack app that turns a receipt photo into structured data, lets a user correct it inline, and saves the final result.

## Stack
- Frontend: Vite + React
- Backend: Node.js + Express (TypeScript)
- Storage: SQLite
- LLM: Gemini (via @google/genai)

## Setup
1. Create the backend env file:
   - Copy server/.env.example to server/.env and set GOOGLE_API_KEY.
2. Install root tooling:
   - npm install
3. Install dependencies for both apps:
   - npm run setup
4. Run the app:
   - npm run dev

Frontend runs on http://localhost:5173 and proxies /api to the backend on http://localhost:3001.

## API (backend)
- POST /api/parse (multipart form field: image)
- POST /api/receipts (JSON body)
- GET /api/receipts
- GET /api/receipts/:id

## Env vars
See server/.env.example for required variables.
