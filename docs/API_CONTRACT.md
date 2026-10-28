# API contract

## `GET /api/health`
Returns `{ "ok": true, "service": "phishlens-api" }`.

## `POST /api/analyze`
Request JSON:
```json
{ "payload": "https://example.com" }
```
- `payload`: required string, trimmed, 1–4096 characters.
- Returns `400` for invalid input, `503` if the server API key is missing, `502` if AI analysis fails.

Success response fields:
- `risk`: `LOW`, `MEDIUM`, `HIGH`, or `UNKNOWN`
- `payloadType`: string
- `evidence`: string array
- `uncertainty`: string
- `recommendedAction`: string array
- `deterministicObservations`: string array
- `disclaimer`: string

## `POST /api/analyze/image`
Request: `multipart/form-data`, field name `image`.

- Accepted MIME types: `image/png`, `image/jpeg`, `image/webp`
- Maximum file size: **2 MB**
- File signature (magic bytes) is verified server-side; declared MIME must match actual content.
- The image is held in memory only and is **never written to disk**.
- Image bytes are **never logged**.

Error responses:
- `400` — missing file or magic-byte mismatch
- `413` — file exceeds 2 MB limit
- `415` — unsupported MIME type
- `503` — server API key not configured
- `502` — AI analysis call failed

Success response fields are **identical** to `POST /api/analyze`:
- `risk`: `LOW`, `MEDIUM`, `HIGH`, or `UNKNOWN`
- `payloadType`: string (describes image content, e.g. "Screenshot — possible phishing message")
- `evidence`: string array (visible indicators detected by the model)
- `uncertainty`: string (always notes that visible URLs were not fetched or verified)
- `recommendedAction`: string array
- `deterministicObservations`: `["No automated URL or domain checks were run on image content — visible text was assessed only."]`
- `disclaimer`: string

> **Note:** Because the assessment is based on visible text only, the model may miss content that is cut off, blurry, or in unsupported scripts. `risk: UNKNOWN` is returned whenever the model cannot produce a justified assessment.
