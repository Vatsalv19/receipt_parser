# Receipt Parser

## What this is
A small full-stack app that turns a receipt photo into structured data, lets a user correct it inline, and saves the final result.

## Stack
- Frontend: Vite + React
- Backend: Node.js + Express (TypeScript)
- Storage: SQLite
- LLM: Gemini (via @google/genai)

## Setup
Prereqs: Node.js + npm.

1. Create the backend env file:
   - Copy server/.env.example to server/.env and set GOOGLE_API_KEY.
2. Install root tooling:
   - npm install
3. Install dependencies for both apps:
   - npm run setup
4. Run the app (both backend and frontend):
   - npm run dev

Frontend runs on http://localhost:5173 and proxies /api to the backend on http://localhost:3001.
If you want to run them separately, use npm run dev:api and npm run dev:ui from the repo root.

## API (backend)
- POST /api/parse (multipart form field: image)
- POST /api/receipts (JSON body)
- GET /api/receipts
- GET /api/receipts/:id

## Env vars
See server/.env.example for required variables.

## Answers to the questions : 

### What did you build?
I built a local full-stack app where a user uploads a receipt image, the backend sends it to Gemini to extract merchant, date, line items, and total, and the UI shows a preview with inline editable fields and a line-item table. The corrected receipt can be saved, and a recent-receipts list loads entries from SQLite.

### Biggest tradeoffs and why
- LLM output handling is strict: I extract the first JSON object and validate it against a schema, then fail fast with a visible error if it does not match. This keeps behavior predictable but means no automatic retries or repair for malformed output.
- Persistence stores the entire receipt JSON in one SQLite column. It is quick to build and flexible for schema tweaks, but it limits queryability and reporting without additional parsing later.
- Line items intentionally exclude taxes, tips, discounts, and subtotals. This keeps the correction UI focused on actual purchases, but it means some receipts need manual fixes when fees are blended into item lines.

### Where did you use an LLM, and for what?
- Runtime: the backend /api/parse endpoint uses Gemini via @google/genai (model default gemini-3-flash-preview, configurable with GEMINI_MODEL) to turn the receipt image into structured JSON.
- Development: I used Claude to plan the project structure and rough prompt shape; I wrote the API myself and used Copilot for guidance and assistance.

### What would you do with another week?
- Add confidence signals or extracted text evidence per field and surface them in the editor to focus corrections.
- Add a retry or repair path for malformed LLM output, plus a fallback model option.
- Normalize dates and currency more aggressively and add validation hints in the UI.
- Add tests around parsing, schema validation, and save flows, including edge cases.
- Add basic image pre-processing (crop/deskew) to improve low-quality inputs.

### One thing I would push back on
I would push for explicit confidence or evidence for each extracted field (or at least raw text lines), because the correction UX depends on knowing what is likely wrong; without that, users must re-verify everything.

## Spec decision details

### What is a line item? Does it matter?
I treat line items as the actual purchased products or services only. Subtotals, taxes, tips, discounts, and fees are excluded. It matters because the editor is optimized for item-level correction; mixing in fees makes the list noisy and harder to reconcile with the total.

### Malformed LLM output: retry, fallback, or fail?
Today it fails loudly. The backend validates the response against a schema and returns an error if it cannot parse clean JSON, and the UI shows an error banner. I would add retries or a repair step with more time.

### Low-confidence extractions (blurry or unusual receipts)
There is no confidence scoring yet. The UI always shows the image preview next to the editable fields so the user can verify and correct manually. With more time, I would add per-field confidence or extracted text highlights.

### How does the user know what to correct?
The app shows the uploaded image alongside the extracted fields and line items, plus a summary and totals. There are no confidence flags yet, so the user relies on side-by-side verification and inline edits.

### Which model did you pick, and why?
I defaulted to gemini-3-flash-preview because it is fast and relatively low cost while still accurate enough for the correction-first workflow. The model is configurable via GEMINI_MODEL if you want to trade more latency or cost for accuracy.
