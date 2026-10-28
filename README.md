# PhishLens AI

A privacy-first, browser-based assistive tool that examines suspicious URLs, text, QR codes, and screenshots for visible phishing and social-engineering indicators — powered by [Gemma 4](https://ai.google.dev/) (`gemma-4-26b-a4b-it`) via the Gemini API (`@google/genai`).

> [!IMPORTANT]
> **Advisory Disclaimer:** PhishLens AI is an assistive defense prototype built for Hacktoberfest Hack Day. AI assessments can be mistaken. A **`LOW`** risk rating does **not** confirm that a destination is safe or benign. Never act on high-consequence messages or enter credentials without verifying through a trusted, out-of-band official channel.

---

## What It Does & The Problem It Solves

Phishing and social engineering attacks — including smishing (SMS), quishing (QR codes), fake banking alerts, payment/UPI fraud, and executive impersonation (BEC) — rely on manufactured urgency and misleading cues. PhishLens AI provides a fast, cautious second opinion on suspicious payloads without introducing risk to the user.

### Core Input Modes

| Input Mode | How It Works | Privacy & Safety Guarantee |
|---|---|---|
| **URL / Free Text** | Paste any suspicious link or text message. The backend runs deterministic structural URL analysis (scheme, subdomain count, embedded user-info) followed by a contextual assessment from Gemma 4. | **Zero-Fetch:** Submitted URLs are analyzed strictly as passive text. PhishLens AI **never** navigates, pings, fetches, or renders remote links. |
| **QR Image (Quishing)** | Upload a PNG, JPEG, or WebP image containing a QR code. | **100% Client-Side:** QR codes are decoded entirely in the browser using HTML5 Canvas and `jsQR`. The image file is **never uploaded to any server**. Decoded content is treated as inert text. |
| **Screenshot** | Upload a screenshot of a suspicious message, email, or web page (PNG, JPEG, WebP ≤ 2 MB). | **RAM-Only Processing:** Image bytes are processed in transient memory buffers (`multer.memoryStorage`) for Gemma 4 vision analysis and are **never written to disk or logged**. Magic byte signatures are verified server-side. |

### What PhishLens AI Never Does

- **Never** visits, fetches, resolves DNS, or previews submitted URLs.
- **Never** auto-opens or auto-links decoded QR destinations.
- **Never** writes uploaded screenshot images to server disk or persistent storage.
- **Never** sends scan history to a remote server database (scan history is strictly local in browser `localStorage`).
- **Never** claims any analysis result is an absolute guarantee of safety or malice.

---

## Interactive Client Features

The frontend is a responsive dashboard with dedicated workflows:

1. **Overview Dashboard:** Instant metrics summary, quick-launch scanner, and high-level threat telemetry.
2. **Analysis Studio:** Multi-modal analysis interface supporting text/URL paste, local QR decoding, and screenshot uploads with drag-and-drop and real-time status reporting.
3. **Scan History:** Client-side audit log with risk categorization, filtering, and single-click re-inspection (stored locally in `localStorage` with user-controlled persistence).
4. **Threat Intelligence Hub:** Interactive reference taxonomy mapping 15+ attack vectors (banking smishing, KYC pressure, UPI refund scams, delivery fraud, scholarship scams, executive impersonation, Hindi-English code-switched phishing) directly to synthetic evaluation datasets (see [`PHISHING_TYPES.md`](PHISHING_TYPES.md)).
5. **Preferences:** Customizable display density (compact mode) and scan history storage toggles.
6. **Developer API Modal:** In-app code generation dialog providing copy-ready integration snippets for `cURL` (JSON & multipart), `JavaScript` (`fetch`), and `Python` (`requests`).

---

## Architecture

```
Browser  (React 19 + TypeScript + Vite, port 5173)
  ├─ URL / Free Text Input ─────────────────────────────────┐
  ├─ QR Decoder: HTML5 Canvas → jsQR (local, zero upload)   │ POST /api/analyze
  ├─ Screenshot Picker (PNG / JPEG / WebP ≤ 2 MB) ─────────┼─POST /api/analyze/image
  └─ Local Audit History (browser localStorage only)        │
                                                            │
Express API Backend  (Node.js 20+ / TypeScript, port 3001)  │
  ├─ Rate Limiting: express-rate-limit (30 req/min per IP)  │
  ├─ RFC Syntax Error Handler: clean JSON 400 responses     │
  ├─ Request Validation: Zod schema & payload bounds (4KB)  │
  ├─ Deterministic URL Parser: structural heuristics        │
  ├─ In-Memory Upload Handler: multer memoryStorage         │
  └─ Google GenAI SDK: @google/genai → gemma-4-26b-a4b-it   │
                                                            │
Structured JSON Assessment (7-field schema) ───────────────→ UI & API Clients
```

### Directory Layout

```
PhishLens-AI-Scaffold/
├── client/                     # Vite + React frontend (TypeScript)
│   ├── src/
│   │   ├── App.tsx             # Main dashboard UI, views & API modal
│   │   ├── index.css           # Design tokens, typography & dark theme styling
│   │   └── types.ts            # Client-side TypeScript types & type guards
│   └── package.json
├── server/                     # Express API backend (TypeScript, ESM)
│   ├── src/
│   │   ├── index.ts            # Express server, rate limiting, error middleware
│   │   ├── config.ts           # Environment configuration & model settings
│   │   ├── routes/
│   │   │   ├── analyze.ts      # POST /api/analyze (URL/Text)
│   │   │   └── analyzeImage.ts # POST /api/analyze/image (Screenshots)
│   │   ├── services/
│   │   │   ├── gemma.ts        # Gemma 4 prompt synthesis & GenAI API client
│   │   │   └── normalise.ts    # Model JSON extraction & defensive normalisation
│   │   └── utils/
│   │       ├── urlParser.ts    # Deterministic URL structural parsing
│   │       └── fileType.ts     # Magic number file signature verification
│   └── package.json
├── docs/                       # Technical & architectural documentation
│   ├── API_CONTRACT.md         # Exact request & response schema definitions
│   ├── ARCHITECTURE.md         # System components & data flow breakdown
│   ├── BUILD_CHECKLIST.md      # Production readiness & verification checklist
│   └── SECURITY.md             # Threat model, input sanitization & secret safety
├── phishing_test.js            # Synthetic phishing benchmark suite (20 cases)
├── PHISHING_TYPES.md           # Detailed catalogue of phishing test categories
├── LICENSE                     # MIT License
└── package.json                # Workspace configuration & unified scripts
```

---

## Prerequisites

- **Node.js 20+** installed (`node --version`)
- **npm 9+** installed (`npm --version`)
- A **Google AI Studio API key** with access to `gemma-4-26b-a4b-it` (obtain one at [Google AI Studio](https://aistudio.google.com/apikey))

---

## Quickstart (Windows PowerShell)

### 1. Clone & Install Dependencies

```powershell
# Clone the repository and navigate into the project directory
git clone https://github.com/bhavya-shikamaru/PhishLens-AI.git
cd PhishLens-AI

# Install all root, server, and client dependencies
npm install
```

### 2. Configure Server Environment

```powershell
# Copy the example environment file to server/.env
copy server\.env.example server\.env
```

Open `server\.env` in an editor and set your API credentials:

```env
PORT=3001
GEMINI_API_KEY=your_google_ai_studio_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
```

> [!CAUTION]
> **Secret Hygiene:** Never put `GEMINI_API_KEY` in `client/.env`, in `VITE_*` variables, or in code committed to Git. `server/.env` is tracked in `.gitignore` and must remain private.

### 3. Run Development Servers

```powershell
# Starts both the backend API and frontend Vite dev server concurrently
npm run dev
```

- **Frontend Application:** <http://localhost:5173>
- **Backend API:** <http://localhost:3001>
- **Health Check Endpoint:** <http://localhost:3001/api/health>

---

## Testing, Typechecking, & Building

The project includes unit test suites, TypeScript static checks, and synthetic phishing model evaluations:

```powershell
# 1. Run backend unit tests (URL parser, normalizer, JSON extraction, fallbacks)
npm test

# 2. Run TypeScript strict typecheck across client and server
npm run typecheck

# 3. Build production bundles (server tsc + client vite build)
npm run build

# 4. Run synthetic phishing evaluation test suite (20 real-world scenarios)
node --test phishing_test.js
```

---

## API Specification

### 1. Text & URL Analysis: `POST /api/analyze`

**Rate Limit:** 30 requests / minute per IP (`RateLimit-*` draft-7 headers returned).

**Request Body** (`application/json`):
```json
{
  "payload": "https://secure-bank-login.com.account-update.xyz/login?session=active"
}
```
- `payload`: string, 1 to 4096 characters (whitespace trimmed).

**Response Body** (`200 OK` — all 7 fields guaranteed present):
```json
{
  "risk": "HIGH",
  "payloadType": "HTTPS URL with suspicious multi-level subdomain and credential keywords",
  "evidence": [
    "Uses deceptive subdomain structure mimicking a legitimate banking domain",
    "Contains urgent credential-soliciting path and query parameters",
    "Domain suffix does not match official banking institutions"
  ],
  "uncertainty": "No live DNS resolution, WHOIS lookup, or redirect tracing was performed.",
  "recommendedAction": [
    "Do not click or navigate to the link.",
    "Do not enter passwords or credentials on this site.",
    "Navigate directly to your banking institution using your verified official mobile app."
  ],
  "deterministicObservations": [
    "Scheme: https",
    "Host: secure-bank-login.com.account-update.xyz",
    "Subdomain count: 3 (elevated)",
    "Port: default"
  ],
  "disclaimer": "Preliminary text-based assessment only. No website was visited or live reputation checked. A LOW rating does not confirm the destination — always verify through an official channel."
}
```

- `risk` values: `LOW` | `MEDIUM` | `HIGH` | `UNKNOWN`

---

### 2. Screenshot Analysis: `POST /api/analyze/image`

**Rate Limit:** 30 requests / minute per IP.

**Request:** `multipart/form-data`, file field named `image`.
- Supported types: `image/png`, `image/jpeg`, `image/webp`.
- Maximum file size: **2 MB**.
- Magic numbers are verified server-side; non-matching signatures or spoofed MIME types are rejected with `400 Bad Request`.
- Held in volatile memory only — never stored on disk.

**Response:** Identical 7-field schema as `POST /api/analyze`.

---

### 3. Service Health Check: `GET /api/health`

**Request:** `GET /api/health` (exempt from rate limits for monitoring availability).

**Response** (`200 OK`):
```json
{
  "ok": true,
  "service": "phishlens-api"
}
```

---

## Supported Inputs & System Boundaries

| Input Type | Supported | Notes & Constraints |
|---|:---:|---|
| HTTPS / HTTP URLs | ✅ | Structural & keyword analysis; links are **never fetched** |
| Plain Text Messages | ✅ | Evaluated for social-engineering, urgent demands, and fee requests |
| QR Code Images | ✅ | Decoded locally via browser `jsQR`; image is never uploaded |
| Screenshots | ✅ | PNG / JPEG / WebP up to 2 MB; processed in RAM only |
| PDF / GIF / Executables | ❌ | Rejected with appropriate HTTP 400 / 415 error codes |
| Malformed JSON payloads | ❌ | Express middleware intercepts SyntaxErrors and returns clean JSON |
| Payloads > 4096 characters | ❌ | Truncation / rejection with HTTP 400 |

---

## Threat Taxonomy & Synthetic Evaluation

PhishLens AI includes an automated benchmark suite ([`phishing_test.js`](phishing_test.js)) and taxonomy document ([`PHISHING_TYPES.md`](PHISHING_TYPES.md)) covering 20 test cases across major attack patterns:

- **Banking & KYC Fraud:** False restriction alerts, KYC suspension threats, and OTP harvesting.
- **Payment & UPI Scams:** Unsafe reverse-charge PIN refund tricks common in mobile messaging.
- **Quishing (QR Phishing):** Deceptive prize claims and authentication hijack lures.
- **Logistics & Delivery Phishing:** Package redelivery fee scams via smishing.
- **Executive Impersonation (BEC):** Urgent confidential bank transfer requests.
- **Multilingual / Code-Switched Lures:** Mixed Hindi-English (Hinglish) smishing attacks.
- **Benign Baselines:** Routine courier notifications, college exam schedules, and legitimate banking statements.

Run the synthetic benchmark test suite:
```powershell
node --test phishing_test.js
```

---

## Known Limitations & Threat Model

- **No Active Network Checks:** PhishLens AI intentionally avoids making outbound HTTP calls, resolving DNS records, checking SSL certificates, or inspecting redirect hops. It cannot detect dynamic server cloaking or geo-fenced malicious payloads.
- **AI Uncertainty:** Language and vision models can make mistakes, hallucinate indicators, or misinterpret benign technical logs. Output should be treated as guidance, never as proof of safety.
- **QR Scanning Fidelity:** Blurry, skewed, low-contrast, or partial QR codes may fail to decode via `jsQR`.
- **Screenshot OCR Constraints:** Small or low-resolution text inside screenshots may be omitted by vision processing.
- **In-Memory Rate Limiting:** Rate limiting uses an in-memory store suitable for single-node prototype deployments; a Redis-backed store would be required for distributed multi-instance clusters.
- **Authentication:** No authentication layer is included in this Hack Day prototype. Authentication and API token management must be added before deploying to an untrusted public network.

---

## License

This project is licensed under the **[MIT License](LICENSE)**.

```
Copyright (c) 2026 Bhavya Khatri, Devendra Gurjar, Dheeraj Gurjar
```

See the [LICENSE](LICENSE) file for complete terms and permissions.
