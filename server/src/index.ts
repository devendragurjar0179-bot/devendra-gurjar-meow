import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { analyzeRouter } from "./routes/analyze.js";
import { analyzeImageRouter } from "./routes/analyzeImage.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "16kb" }));

// ── Rate limiting — applied to AI-backed endpoints only ───────────────────────
// 30 requests per minute per IP is generous for a demo/prototype where each
// request triggers an expensive model call.  The /api/health check is excluded
// so health monitoring is never blocked.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1-minute sliding window
  max: 30,                     // max 30 requests per window per IP
  standardHeaders: "draft-7", // emit RateLimit-* headers (RFC 9110 style)
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before trying again." },
  skipSuccessfulRequests: false,
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "phishlens-api" }));
app.use("/api/analyze", apiLimiter, analyzeRouter);
app.use("/api/analyze/image", apiLimiter, analyzeImageRouter);

// ── JSON parse error handler ──────────────────────────────────────────────────
// Must be 4-arg to be recognised by Express as an error handler.
// Catches body-parser SyntaxErrors and returns clean JSON instead of the default
// HTML page (which leaks the full Node.js stack trace and file-system path).
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Request body contains invalid JSON." });
  }
  next(err);
});

app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));

export { app };
export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`PhishLens API listening on http://localhost:${port}`);
  });
}
