# Norms & Standards Compliance Engine

React + Node.js implementation of an AI-assisted compliance engine for identifying and validating technical norms (ISO, DIN, ANSI, IEC, EN, ASTM) inside PDF and DOCX documents.

## Implemented Capabilities

- Document ingestion for PDF and DOCX.
- Text extraction with positional metadata (line-level spans) for interactive highlighting.
- Norm detection using regex + Azure OpenAI assisted categorization.
- Real-time status validation through Serper or Tavily search APIs.
- Interactive compliance UI with click-to-inspect sidebar.
- Persistence in DuckDB with a reusable Master Standards Table.
- Cached lookup to reduce repeated internet checks and API cost.

## Architecture

- Frontend: React, Tailwind CSS, Zustand, Vite
- Backend: Express, TypeScript, Multer, DuckDB
- AI/LLM: Azure OpenAI (optional via environment variables)
- Validation: Serper and/or Tavily (optional)

## Project Structure

- `frontend/`: React compliance UI and document highlight review panel
- `backend/`: Ingestion, extraction, NER/categorization, validation, and persistence APIs

## Backend Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in keys if available:
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `SERPER_API_KEY` and/or `TAVILY_API_KEY`
3. Start backend:

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:8080`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls backend API endpoints.

## API Endpoints

- `GET /health`
- `POST /api/compliance/analyze` (multipart field name: `file`)
- `GET /api/standards`

## Data Model (DuckDB)

- `documents`: uploaded file metadata + extracted text
- `standards`: detected standard mentions, category, validation result, and source link/snippet

## Notes

- When search API keys are not configured, validation falls back to `Unknown` status with guidance in the source snippet.
- The highlight layer currently uses line-level and character-range metadata from extraction for fast interactive review.
