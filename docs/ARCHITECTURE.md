# Architecture

## Component overview

```
Browser  (React + Vite · port 5173)
  ├─ URL / Text tab
  │    └─ POST /api/analyze  { payload: string }
  │
  ├─ QR Image tab
  │    ├─ File picker or drag-and-drop (PNG / JPEG / WebP, ≤ 5 MB)
  │    ├─ canvas → jsQR (decode entirely in browser — image never leaves client)
  │    ├─ Decoded text displayed as inert <code> (not a link)
  │    └─ POST /api/analyze  { payload: <decoded string> }
  │
  └─ Screenshot tab
       ├─ File picker (PNG / JPEG / WebP, ≤ 2 MB)
       └─ POST /api/analyze/image  (multipart/form-data, field: image)

Express + TypeScript API  (port 3001)
  ├─ GET  /api/health
  ├─ POST /api/analyze
  │    ├─ Zod validation (payload: string, 1–4096 chars)
  │    ├─ inspectPayload() — deterministic URL structural observations
  │    └─ GoogleGenAI → gemma-4-26b-a4b-it  (text prompt)
  │
  └─ POST /api/analyze/image
       ├─ multer memoryStorage (≤ 2 MB, MIME + magic-byte check)
       └─ GoogleGenAI → gemma-4-26b-a4b-it  (multipart: inlineData + text prompt)

Both routes return the same 7-field JSON shape (see docs/API_CONTRACT.md).
```

## Workspace layout

```
PhishLens-AI-Scaffold/
  client/           React + Vite frontend (TypeScript)
    src/
      App.tsx       All UI logic (tabs, fetch calls, result rendering)
      types.ts      Assessment interface + isAssessment() runtime guard
      styles.css    Single minified stylesheet
  server/           Express API (TypeScript, ESM)
    src/
      index.ts      App bootstrap, middleware, route mounts, error handlers
      routes/
        analyze.ts       POST /api/analyze handler
        analyzeImage.ts  POST /api/analyze/image handler
      lib/
        analyzeHelpers.ts  parseJsonObject, stringArray, normaliseRisk, DISCLAIMER
        urlIndicators.ts   inspectPayload() — deterministic URL checks (no network)
        analyzeHelpers.test.ts
        urlIndicators.test.ts
    .env.example
  docs/
    API_CONTRACT.md
    ARCHITECTURE.md  (this file)
    BUILD_CHECKLIST.md
    SECURITY.md
  package.json      npm workspaces root
```

## Boundaries

- No submitted URL is fetched, opened, crawled, or resolved.
- QR images are decoded in the browser; only the decoded string reaches the server.
- Screenshot images are sent to the server as bytes, processed in RAM, and never written to disk.
- The Gemini API key exists only in `server/.env` and is read via `process.env` server-side.
- AI output is untrusted: validated, normalised, and bounded before returning to the client.
- No persistence or database is configured.
