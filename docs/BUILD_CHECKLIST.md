# Build checklist

## First run

- [ ] Copy `server\.env.example` to `server\.env` and set `GEMINI_API_KEY=your_key_here`.
- [ ] Run `npm install` from the project root.
- [ ] Run `npm run typecheck` — should exit 0.
- [ ] Run `npm test` — should show 27 tests passing.
- [ ] Run `npm run dev`.
- [ ] Open <http://localhost:5173> and verify the UI loads.
- [ ] Check <http://localhost:3001/api/health> returns `{"ok":true}`.

## Manual acceptance tests

### URL / Text tab
- [ ] Paste `https://example.com` → result renders with all fields, including disclaimer.
- [ ] Submit an empty input → "Enter a URL or text payload…" error shown; no request sent.
- [ ] Paste a string longer than 4096 characters → error shown before submit.

### QR Image tab
- [ ] Upload a PNG containing a known QR code → decoded text appears in `<code>` box (not a link).
- [ ] Upload a non-image file (e.g. `.txt`) → "Choose a PNG, JPEG, or WebP image" error.
- [ ] Upload an image with no QR code → "No QR code found in this image" error.
- [ ] Click **Analyze payload** on a decoded QR → result renders same as text tab.
- [ ] Drag-and-drop a QR image onto the drop zone → same decode behaviour as picker.
- [ ] Confirm the browser Network tab shows **no upload of the image file** to the server.

### Screenshot tab
- [ ] Upload a PNG screenshot (≤ 2 MB) → spinner → result with all 7 fields.
- [ ] Check `deterministicObservations` says "No automated URL or domain checks were run…".
- [ ] Upload a file > 2 MB → "Image must be 2 MB or smaller" error (from server).
- [ ] Upload a `.gif` or `.pdf` → MIME error shown.

### Error and edge cases
- [ ] Stop the server, submit a URL → network error shown with retry button; no crash.
- [ ] Reset clears all state in each tab without stale data leaking across tabs.
- [ ] Confirm no API key appears in browser Network tab, DevTools console, or JS bundle.

## Pre-commit checks
- [ ] `git check-ignore -v server/.env` shows `.env` is ignored.
- [ ] `git ls-files server/.env` returns empty (not tracked).
- [ ] `git diff --cached` contains no secrets.
- [ ] `npm run build` exits 0.
