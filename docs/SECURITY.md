# Security notes

## API key

- `GEMINI_API_KEY` lives only in `server/.env`.
- It is read via `process.env` in the route handler; it is never logged, returned to the client, or included in any tracked file.
- `server/.env` is covered by `.gitignore` (`grep '\.env' .gitignore` to verify).
- `.env.example` contains only a placeholder value.

## Input handling

- All text and URL payloads are validated with Zod before reaching the AI layer: required, trimmed, 1–4096 characters.
- Uploaded images are validated by MIME type (allowlist), declared size (multer `limits.fileSize`), and file-signature magic bytes before any processing.
- Malformed JSON request bodies return a clean `400` JSON error; no stack trace or file-system path is exposed.
- No submitted URL is fetched, resolved, crawled, or previewed by the server or client.

## QR codes

- QR images are decoded entirely in the browser (`jsQR` via canvas `getImageData`).
- The image is never uploaded to the server.
- Decoded content is displayed as plain `<code>` text — not a hyperlink, not rendered as HTML.
- File type (PNG/JPEG/WebP), size (≤ 5 MB), and pixel dimensions (≤ 16 MP) are validated before decoding.

## Screenshot images

- Images are received via `multer` with `memoryStorage()` — bytes are held in RAM only.
- No image is written to disk.
- Image bytes are never logged.
- The model prompt instructs Gemma 4 to treat all visible text and URLs as untrusted and not to follow them.

## AI output

- Model output is treated as untrusted text. It is parsed with `parseJsonObject`, which extracts the first complete JSON object using a balanced-brace scan. Trailing injected content is ignored.
- `normaliseRisk` coerces any unrecognised risk value to `UNKNOWN`. Empty or null model output can never produce a LOW/MEDIUM/HIGH result.
- `stringArray` bounds array fields to 8 items of up to 400 characters each.
- An empty model response, a blocked response, or a parse failure all yield `risk: UNKNOWN` with an explicit uncertainty message — never a silent "clean" result.
- The client's `isAssessment()` runtime guard rejects any server response missing required fields before showing results.

## Client

- No `VITE_*` environment variables are used for secrets.
- No `dangerouslySetInnerHTML`, `eval()`, or `new Function()` is present.
- No `window.open`, `window.location.assign`, or external `fetch` to user-submitted content.
- All submitted content is rendered as React text nodes or `<code>` elements.

## CORS

- In development: requests from `http://localhost:5173` only.
- In production (`NODE_ENV=production`): CORS origin is set to `false` (all cross-origin requests blocked). Configure an explicit origin for any real deployment.

## Before any public deployment

- Add authentication or a shared secret if the API must be semi-public.
- Add rate limiting per IP to protect the AI provider quota.
- Configure a production-grade secrets manager rather than a `.env` file.
- Set `NODE_ENV=production` and configure a specific CORS `origin`.
- Review and tighten CSP headers.
