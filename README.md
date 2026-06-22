# Tailor — AI Resume Tailoring Platform

Upload a resume (PDF/DOCX), paste a job description, and get back a tailored,
professionally formatted `.docx` resume — rewritten to match the role using
**only** information that's actually in your original resume (no fabricated
experience).

## How it works

1. **Frontend** (React + Vite + Tailwind) — upload UI, job description input, results view with download.
2. **Backend** (Node.js + Express) —
   - Extracts text from the uploaded PDF/DOCX (`pdf-parse`, `mammoth`)
   - Sends resume text + job description to Claude (`claude-sonnet-4-6`), which parses the resume into structured data and rewrites the summary, skills, and experience bullets to match the role
   - Regenerates a clean, professionally formatted `.docx` from that structured data (`docx` npm package) — this guarantees consistent, good-looking output regardless of how messy the original file was
   - Returns a download link

## Project structure

```
resume-tailor/
├── backend/
│   ├── server.js          # Express server + /api/tailor, /api/download routes
│   ├── fileParser.js       # PDF/DOCX → plain text extraction
│   ├── tailorResume.js     # Claude API call: parse + tailor resume
│   ├── generateDocx.js     # Structured data → formatted .docx
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── UploadPanel.jsx
    │       ├── ProcessingState.jsx
    │       └── ResultPanel.jsx
    ├── package.json
    └── .env.example
```

## Local setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com/

```bash
npm run dev
```

Backend runs at `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`. Open it in your browser.

## Deployment

**Backend (Render, Railway, Fly.io, or similar):**
- Deploy the `backend/` folder as a Node web service
- Set environment variables: `ANTHROPIC_API_KEY`, `FRONTEND_URL` (your deployed frontend URL), `PORT` (usually auto-set by the host)
- Start command: `npm start`

**Frontend (Vercel or Netlify):**
- Deploy the `frontend/` folder
- Set build command: `npm run build`, output directory: `dist`
- Set environment variable `VITE_API_URL` to your deployed backend URL

**Important:** Update CORS in `backend/server.js` (`FRONTEND_URL` env var) to match your live frontend domain, or uploads will be blocked.

## Notes on the current implementation

- **File storage**: generated `.docx` files are kept in memory for 30 minutes, keyed by a one-time download token. Fine for moderate traffic; swap for S3 or disk storage if you need files to survive a server restart or scale across multiple instances.
- **No PDF output yet**: only `.docx` is generated. Adding PDF export would mean either (a) converting the generated docx to PDF server-side (e.g. via LibreOffice headless or a service like CloudConvert), or (b) rendering the structured resume data directly to PDF (e.g. with `pdf-lib` or Puppeteer + an HTML template). Happy to add either — just say which.
- **No accounts/history yet**: this is a stateless "upload → get result" flow, matching what you asked for in v1. Adding accounts (so users can save past tailored resumes) would mean adding a database (e.g. Postgres) and auth (e.g. Clerk or simple JWT) — straightforward to layer on later.
- **Honesty constraint**: the system prompt in `tailorResume.js` explicitly instructs Claude not to invent skills, employers, dates, or achievements. This is a prompt-level guardrail, not a hard technical one — worth spot-checking outputs, especially early on.

## Next steps you might want

- PDF export
- User accounts + resume history
- A "diff" view showing exact before/after text per bullet (currently we show a plain-language changes summary instead)
- Support for multiple resume versions per job application
