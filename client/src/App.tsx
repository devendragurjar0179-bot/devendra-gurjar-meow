import { useEffect, useRef, useState, type ChangeEvent } from "react";
import jsQR from "jsqr";
import {
  Bell,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Clock3,
  FileImage,
  History as HistoryIcon,
  Image as ImageIcon,
  LayoutDashboard,
  Link as LinkIcon,
  Lock,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  RotateCcw,
  ScanLine,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import type { Assessment, Risk } from "./types";
import { isAssessment } from "./types";

type InputMode = "URL / Text" | "QR image" | "Screenshot";
type View = "Overview" | "Analyze" | "History" | "Threat intel" | "Preferences";

interface HistoryEntry {
  id: string;
  label: string;
  mode: InputMode;
  risk?: Risk;
  createdAt: number;
}

const PRIMARY_NAV: Array<[Exclude<View, "Preferences">, typeof LayoutDashboard]> = [
  ["Overview", LayoutDashboard],
  ["Analyze", ScanLine],
  ["History", HistoryIcon],
  ["Threat intel", ShieldAlert],
];

const MAX_PAYLOAD = 4096;
const MAX_QR_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_PIXELS = 16_000_000;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function readHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem("phishlens-history") ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [activeView, setActiveView] = useState<View>("Analyze");
  const [mode, setMode] = useState<InputMode>("URL / Text");
  const [payload, setPayload] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(readHistory);

  // Preference states
  const [compact, setCompact] = useState(false);
  const [saveLocalHistory, setSaveLocalHistory] = useState(true);
  const [showApiModal, setShowApiModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (saveLocalHistory) {
      localStorage.setItem("phishlens-history", JSON.stringify(history));
    }
  }, [history, saveLocalHistory]);

  useEffect(() => {
    const compactLayout = window.matchMedia("(max-width: 900px)");
    const closeForCompact = () => {
      if (compactLayout.matches) setSidebarOpen(false);
    };
    closeForCompact();
    compactLayout.addEventListener("change", closeForCompact);
    return () => compactLayout.removeEventListener("change", closeForCompact);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function chooseView(view: View) {
    setActiveView(view);
    if (window.innerWidth <= 900) setSidebarOpen(false);
  }

  function resetInput() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPayload("");
    setSelectedFile(null);
    setFileName("");
    setError("");
    setAssessment(null);
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function switchMode(newMode: InputMode) {
    resetInput();
    setMode(newMode);
  }

  // Local in-browser QR decoding
  async function decodeQR(file: File) {
    setError("");
    setAssessment(null);
    setPayload("");
    setFileName(file.name);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setError("QR image must be 5 MB or smaller.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > MAX_PIXELS) {
        bitmap.close();
        setError("Image dimensions are too large to process safely (max 16 MP).");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        bitmap.close();
        throw new Error("Could not initialize local image decoding.");
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imgData.data, imgData.width, imgData.height);

      if (!decoded || !decoded.data.trim()) {
        setError("No QR code found in this image. Try a clearer photo with the whole code in frame.");
        return;
      }

      const text = decoded.data.trim();
      if (text.length > MAX_PAYLOAD) {
        setError(`Decoded QR content is too long (${text.length} characters; max ${MAX_PAYLOAD}).`);
        return;
      }

      setPayload(text);
    } catch {
      setError("The image could not be decoded. Try a valid, non-corrupt image file.");
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setSelectedFile(file);
    if (mode === "QR image") {
      void decodeQR(file);
    } else {
      setError("");
      setAssessment(null);
      setFileName(file.name);
    }
  }

  function recordHistory(entryLabel: string, entryRisk?: Risk) {
    if (!saveLocalHistory) return;
    const item: HistoryEntry = {
      id: crypto.randomUUID(),
      label: entryLabel,
      mode,
      risk: entryRisk,
      createdAt: Date.now(),
    };
    setHistory((prev) => [item, ...prev].slice(0, 20));
  }

  // Live URL / Text submission
  async function submitText() {
    const value = payload.trim();
    if (!value) {
      setError(mode === "QR image" ? "Upload a readable QR code first." : "Enter a URL or text payload first.");
      return;
    }
    if (value.length > MAX_PAYLOAD) {
      setError(`Payload must be ${MAX_PAYLOAD.toLocaleString()} characters or fewer.`);
      return;
    }
    if (busy) return;

    setError("");
    setAssessment(null);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: value }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Body was empty or not JSON (e.g. proxy reset or HTML error)
      }

      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : `Analysis service returned HTTP ${res.status}. Please try again.`;
        throw new Error(msg);
      }

      if (!data || !isAssessment(data)) {
        throw new Error("The server returned an empty or invalid assessment format. Please try again.");
      }

      setAssessment(data);
      recordHistory(value, data.risk);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to connect to the analysis service.");
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  // Live Screenshot submission
  async function submitScreenshot() {
    if (!selectedFile) {
      setError("Please choose a screenshot image first.");
      return;
    }
    if (selectedFile.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot must be 2 MB or smaller.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError("Choose a PNG, JPEG, or WebP screenshot.");
      return;
    }
    if (busy) return;

    setError("");
    setAssessment(null);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const form = new FormData();
      form.append("image", selectedFile);

      const res = await fetch("/api/analyze/image", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Body was empty or not JSON
      }

      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : `Image analysis failed (HTTP ${res.status}). Please try again.`;
        throw new Error(msg);
      }

      if (!data || !isAssessment(data)) {
        throw new Error("Received an unexpected response format from the server.");
      }

      setAssessment(data);
      recordHistory(selectedFile.name, data.risk);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to connect to image analysis server.");
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function handleSubmit() {
    if (mode === "Screenshot") {
      void submitScreenshot();
    } else {
      void submitText();
    }
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-is-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar" aria-label="Primary navigation" aria-hidden={!sidebarOpen}>
        <button className="brand" type="button" onClick={() => chooseView("Overview")}>
          <span className="brand-mark">
            <ScanSearch size={16} />
          </span>
          <span>PhishLens <b>AI</b></span>
        </button>

        <button
          className="mobile-sidebar-close"
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={16} />
        </button>

        <div className="sidebar-label">Workspace</div>
        <nav>
          {PRIMARY_NAV.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${activeView === name ? "active" : ""}`}
              type="button"
              onClick={() => chooseView(name)}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-label extra">System</div>
        <nav>
          <button
            className={`nav-item ${activeView === "Preferences" ? "active" : ""}`}
            type="button"
            onClick={() => chooseView("Preferences")}
          >
            <SlidersHorizontal size={16} />
            Preferences
          </button>
        </nav>

        <div className="profile">
          <span className="avatar">PL</span>
          <span>Security Analyst</span>
          <ChevronsUpDown size={13} />
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="main">
        {/* Top Header */}
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button"
              type="button"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <strong>Security workspace</strong>
            <ChevronRight size={13} />
            <span>{activeView}</span>
          </div>

          <div className="top-actions">
            <button
              className="get-api-btn"
              type="button"
              onClick={() => setShowApiModal(true)}
            >
              <Code2 size={14} />
              <span>Get API</span>
            </button>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={15} />
            </button>
            <button className="icon-button" type="button" aria-label="Help">
              <CircleHelp size={15} />
            </button>
          </div>
        </header>

        {/* View Pages */}
        <div className="page">
          {activeView === "Analyze" && (
            <AnalyzeView
              mode={mode}
              payload={payload}
              selectedFile={selectedFile}
              fileName={fileName}
              dragOver={dragOver}
              busy={busy}
              error={error}
              assessment={assessment}
              fileInputRef={fileInputRef}
              onSwitchMode={switchMode}
              onPayloadChange={setPayload}
              onFileSelect={handleFileSelect}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  if (mode === "QR image") void decodeQR(file);
                  else setFileName(file.name);
                }
              }}
              onReset={resetInput}
              onSubmit={handleSubmit}
            />
          )}

          {activeView === "Overview" && (
            <OverviewView
              history={history}
              onAnalyze={() => chooseView("Analyze")}
            />
          )}

          {activeView === "History" && (
            <HistoryView
              history={history}
              onClear={() => setHistory([])}
            />
          )}

          {activeView === "Threat intel" && <ThreatIntelView />}

          {activeView === "Preferences" && (
            <PreferencesView
              compact={compact}
              saveLocalHistory={saveLocalHistory}
              onToggleCompact={setCompact}
              onToggleSaveHistory={setSaveLocalHistory}
            />
          )}
        </div>
      </main>

      {showApiModal && <ApiModal onClose={() => setShowApiModal(false)} />}
    </div>
  );
}

// ── View 1: Analyze View ──────────────────────────────────────────────────────
interface AnalyzeViewProps {
  mode: InputMode;
  payload: string;
  selectedFile: File | null;
  fileName: string;
  dragOver: boolean;
  busy: boolean;
  error: string;
  assessment: Assessment | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSwitchMode: (mode: InputMode) => void;
  onPayloadChange: (val: string) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onReset: () => void;
  onSubmit: () => void;
}

function AnalyzeView({
  mode,
  payload,
  selectedFile,
  fileName,
  dragOver,
  busy,
  error,
  assessment,
  fileInputRef,
  onSwitchMode,
  onPayloadChange,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onReset,
  onSubmit,
}: AnalyzeViewProps) {
  return (
    <>
      <section className="intro">
        <div className="eyebrow">
          <Sparkles size={12} />
          QR &amp; URL Security Analysis
        </div>
        <h1>
          Inspect first.<br />
          <em>Click safer.</em>
        </h1>
        <p>Assess suspicious links, text, and QR images before they earn your trust.</p>
      </section>

      <section className="analysis-grid" aria-label="Link analysis">
        {/* Step 01: Input Panel */}
        <article className="panel">
          <div className="panel-header">
            <h2>
              <span className="step">01</span>
              Inspect a payload
            </h2>
            <span>Private scan</span>
          </div>

          <div className="panel-content">
            <div className="mode-tabs" aria-label="Payload type">
              <button
                className={mode === "URL / Text" ? "active" : ""}
                type="button"
                onClick={() => onSwitchMode("URL / Text")}
              >
                <LinkIcon size={14} />
                URL / Text
              </button>
              <button
                className={mode === "QR image" ? "active" : ""}
                type="button"
                onClick={() => onSwitchMode("QR image")}
              >
                <QrCode size={14} />
                QR image
              </button>
              <button
                className={mode === "Screenshot" ? "active" : ""}
                type="button"
                onClick={() => onSwitchMode("Screenshot")}
              >
                <ImageIcon size={14} />
                Screenshot
              </button>
            </div>

            {mode === "URL / Text" && (
              <>
                <label htmlFor="payload">URL or text payload</label>
                <textarea
                  id="payload"
                  maxLength={MAX_PAYLOAD}
                  value={payload}
                  onChange={(e) => onPayloadChange(e.target.value)}
                  placeholder="Paste a suspicious URL, message, or email text..."
                />
                <div className="input-meta">
                  <span>{payload.length.toLocaleString()} / {MAX_PAYLOAD.toLocaleString()} characters</span>
                  <button type="button" onClick={onReset}>
                    <RotateCcw size={11} style={{ marginRight: 4 }} />
                    Reset
                  </button>
                </div>
              </>
            )}

            {mode === "QR image" && (
              <>
                <label
                  className={`dropzone ${dragOver ? "dragover" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage size={24} />
                  <strong>{fileName ? fileName : "Choose or drag a QR code image"}</strong>
                  <span>Supports PNG, JPEG, WebP (up to 5 MB) · Decoded locally in browser</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onFileSelect}
                  />
                </label>

                {payload && (
                  <div className="decoded-box">
                    <span className="decoded-title">
                      <CheckCircle2 size={13} />
                      Decoded content (inert text):
                    </span>
                    <code>{payload}</code>
                  </div>
                )}

                <div className="input-meta">
                  <span>{payload ? `${payload.length} characters extracted` : "No code loaded"}</span>
                  <button type="button" onClick={onReset}>
                    <RotateCcw size={11} style={{ marginRight: 4 }} />
                    Reset
                  </button>
                </div>
              </>
            )}

            {mode === "Screenshot" && (
              <>
                <label
                  className={`dropzone ${dragOver ? "dragover" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage size={24} />
                  <strong>{selectedFile ? selectedFile.name : "Choose a message or page screenshot"}</strong>
                  <span>
                    {selectedFile
                      ? `${Math.ceil(selectedFile.size / 1024)} KB selected`
                      : "Drag & drop, or browse from device (max 2 MB)"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onFileSelect}
                  />
                </label>

                <div className="input-meta">
                  <span>{selectedFile ? "Ready for multimodal evaluation" : "No screenshot selected"}</span>
                  <button type="button" onClick={onReset}>
                    <RotateCcw size={11} style={{ marginRight: 4 }} />
                    Reset
                  </button>
                </div>
              </>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <button
              className="primary-action"
              type="button"
              disabled={busy || (mode !== "Screenshot" && !payload.trim()) || (mode === "Screenshot" && !selectedFile)}
              onClick={onSubmit}
            >
              {busy ? (
                <>
                  <LoaderCircle size={15} className="spin" />
                  Analyzing with Gemma 4...
                </>
              ) : (
                <>
                  Analyze payload <ChevronRight size={15} />
                </>
              )}
            </button>

            <p className="privacy">
              <LockKeyhole size={13} />
              {mode === "Screenshot"
                ? "Image is analyzed in RAM only and never stored to disk."
                : "Only decoded text is submitted. Destination links are never visited."}
            </p>
          </div>
        </article>

        {/* Step 02: Result Panel */}
        <article className="panel result-panel">
          <div className="panel-header">
            <h2>
              <span className="step">02</span>
              Risk assessment
            </h2>
            <span>{assessment ? "Gemma 4 Verified" : "AI Assisted"}</span>
          </div>

          {busy ? (
            <div className="loading-state">
              <LoaderCircle size={36} className="spin" />
              <strong>Evaluating security indicators</strong>
              <span>Gemma 4 (gemma-4-26b-a4b-it) · Multi-angle evaluation</span>
            </div>
          ) : assessment ? (
            <div className="result-scroll">
              {/* Risk Badge */}
              <div className={`risk-banner ${assessment.risk.toLowerCase()}`}>
                <div className="risk-icon">
                  {assessment.risk === "HIGH" ? (
                    <AlertTriangle size={22} />
                  ) : assessment.risk === "LOW" ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <ShieldAlert size={22} />
                  )}
                </div>
                <div className="risk-details">
                  <span className="result-label">Assessed Risk</span>
                  <strong>{assessment.risk}</strong>
                  <span className="risk-type-tag">{assessment.payloadType}</span>
                </div>
              </div>

              {/* Observed Evidence */}
              {assessment.evidence.length > 0 && (
                <div className="result-section">
                  <h3>Observed Evidence</h3>
                  <ul>
                    {assessment.evidence.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deterministic Observations */}
              {assessment.deterministicObservations.length > 0 && (
                <div className="result-section">
                  <h3>Structural Observations</h3>
                  <ul>
                    {assessment.deterministicObservations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Uncertainty */}
              {assessment.uncertainty && (
                <div className="result-section">
                  <h3>Uncertainty &amp; Unknowns</h3>
                  <p>{assessment.uncertainty}</p>
                </div>
              )}

              {/* Recommended Actions */}
              {assessment.recommendedAction.length > 0 && (
                <div className="result-section">
                  <h3>Recommended Safe Actions</h3>
                  <ul>
                    {assessment.recommendedAction.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="disclaimer-box">
                <strong>Safety Disclaimer:</strong> {assessment.disclaimer}
              </div>
            </div>
          ) : (
            <div className="empty-result">
              <div className="shield">
                <ShieldCheck size={32} />
              </div>
              <h2>Your results will appear here</h2>
              <p>
                Submit a link, text message, QR image, or screenshot to receive a structured risk breakdown and safe next steps.
              </p>
              <div className="assurances">
                <span><ShieldCheck size={12} /> Evidence-led</span>
                <span><Lock size={12} /> No auto-opening</span>
                <span><CheckCircle2 size={12} /> Local QR decode</span>
              </div>
            </div>
          )}

          <div className="result-note">
            <b>Protection note:</b> links are never opened or fetched during inspection.
          </div>
        </article>
      </section>

      <footer>
        <span>PHISHLENS AI · SECURITY WORKSPACE</span>
        <span>POWERED BY GEMMA 4 · ZERO-DESTINATION INSPECTION</span>
      </footer>
    </>
  );
}

// ── View 2: Overview View ─────────────────────────────────────────────────────
function OverviewView({
  history,
  onAnalyze,
}: {
  history: HistoryEntry[];
  onAnalyze: () => void;
}) {
  return (
    <>
      <section className="view-heading">
        <div>
          <span className="eyebrow left">
            <Sparkles size={12} />
            Workspace Overview
          </span>
          <h1>Security at a glance.</h1>
          <p>Everything inspected in this browser session is tracked locally.</p>
        </div>
        <button className="secondary-action" type="button" onClick={onAnalyze}>
          Analyze a payload <ChevronRight size={15} />
        </button>
      </section>

      <section className="metric-grid">
        <article className="metric">
          <span>Prepared checks</span>
          <strong>{history.length}</strong>
          <small>In local session history</small>
        </article>
        <article className="metric">
          <span>Supported channels</span>
          <strong>3</strong>
          <small>URL/Text, QR Code, Screenshot</small>
        </article>
        <article className="metric">
          <span>Auto-opening</span>
          <strong>Off</strong>
          <small>By security design</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Recent Activity</h2>
          <span>{history.length} Item{history.length === 1 ? "" : "s"}</span>
        </div>
        <div className="history-rows">
          {history.length === 0 ? (
            <p className="empty-copy">No payloads prepared yet in this session.</p>
          ) : (
            history.slice(0, 6).map((item) => (
              <div className="history-row" key={item.id}>
                <span className="history-icon">
                  {item.mode === "URL / Text" ? (
                    <LinkIcon size={15} />
                  ) : item.mode === "QR image" ? (
                    <QrCode size={15} />
                  ) : (
                    <FileImage size={15} />
                  )}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.mode} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {item.risk && (
                  <span className={`local-tag ${item.risk.toLowerCase()}`}>
                    {item.risk}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

// ── View 3: History View ──────────────────────────────────────────────────────
function HistoryView({
  history,
  onClear,
}: {
  history: HistoryEntry[];
  onClear: () => void;
}) {
  return (
    <>
      <section className="view-heading">
        <div>
          <span className="eyebrow left">
            <Clock3 size={12} />
            Local Session
          </span>
          <h1>Analysis History.</h1>
          <p>Inspected payloads saved privately in your browser storage.</p>
        </div>
        {history.length > 0 && (
          <button className="secondary-action" type="button" onClick={onClear}>
            <X size={14} />
            Clear history
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Saved Scans</h2>
          <span>Local Only</span>
        </div>
        <div className="history-rows">
          {history.length === 0 ? (
            <p className="empty-copy">No scan history recorded yet.</p>
          ) : (
            history.map((item) => (
              <div className="history-row" key={item.id}>
                <span className="history-icon">
                  {item.mode === "URL / Text" ? (
                    <LinkIcon size={15} />
                  ) : item.mode === "QR image" ? (
                    <QrCode size={15} />
                  ) : (
                    <FileImage size={15} />
                  )}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.mode} · {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {item.risk && (
                  <span className={`local-tag ${item.risk.toLowerCase()}`}>
                    {item.risk}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

// ── View 4: Threat Intel View ─────────────────────────────────────────────────
function ThreatIntelView() {
  return (
    <>
      <section className="view-heading">
        <div>
          <span className="eyebrow left">
            <ShieldAlert size={12} />
            Reference Panel
          </span>
          <h1>Threat Intelligence.</h1>
          <p>Key social-engineering indicators and attack vectors evaluated by Gemma 4.</p>
        </div>
      </section>

      <section className="intel-grid">
        <article className="intel-card">
          <ShieldAlert size={20} />
          <h2>Credential Harvesting</h2>
          <p>
            Lookalike sign-in pages, typosquatted domains, and urgent alerts designed to trick victims into entering passwords, PINs, or 2FA codes.
          </p>
        </article>

        <article className="intel-card">
          <ShieldAlert size={20} />
          <h2>QR Phishing ("Quishing")</h2>
          <p>
            Malicious QR codes deployed in physical locations or PDF invoices that shift navigation from secured corporate desktops to unfiltered mobile phones.
          </p>
        </article>

        <article className="intel-card">
          <ShieldAlert size={20} />
          <h2>Urgency &amp; Impersonation</h2>
          <p>
            Coercive claims regarding account suspension, fake KYC compliance, or overdue package fees intended to provoke hasty, unverified decisions.
          </p>
        </article>
      </section>
    </>
  );
}

// ── View 5: Preferences View ──────────────────────────────────────────────────
function PreferencesView({
  compact,
  saveLocalHistory,
  onToggleCompact,
  onToggleSaveHistory,
}: {
  compact: boolean;
  saveLocalHistory: boolean;
  onToggleCompact: (v: boolean) => void;
  onToggleSaveHistory: (v: boolean) => void;
}) {
  return (
    <>
      <section className="view-heading">
        <div>
          <span className="eyebrow left">
            <SlidersHorizontal size={12} />
            Workspace Settings
          </span>
          <h1>Preferences.</h1>
          <p>Configure local display and history preferences for this browser.</p>
        </div>
      </section>

      <section className="panel preference-panel">
        <label className="preference">
          <span>
            <strong>Compact layout mode</strong>
            <small>Adjust padding and spacing in analysis panels.</small>
          </span>
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => onToggleCompact(e.target.checked)}
          />
        </label>

        <label className="preference">
          <span>
            <strong>Store local scan history</strong>
            <small>Keep an encrypted-at-rest session record in browser localStorage.</small>
          </span>
          <input
            type="checkbox"
            checked={saveLocalHistory}
            onChange={(e) => onToggleSaveHistory(e.target.checked)}
          />
        </label>
      </section>
    </>
  );
}

// ── ApiModal Component ────────────────────────────────────────────────────────
function ApiModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"text" | "image" | "javascript" | "python">("text");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
  const apiEndpoint = baseUrl.includes("5173") ? "http://localhost:3001" : baseUrl;

  const snippets: Record<typeof activeTab, string> = {
    text: `curl -X POST "${apiEndpoint}/api/analyze" \\
  -H "Content-Type: application/json" \\
  -d '{"payload": "https://secure-login-verify.com/account"}'`,
    image: `curl -X POST "${apiEndpoint}/api/analyze/image" \\
  -F "image=@suspicious_message.png"`,
    javascript: `const response = await fetch("${apiEndpoint}/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: "https://secure-login-verify.com/account"
  })
});
const result = await response.json();
console.log("Assessed risk:", result.risk);
console.log("Evidence:", result.evidence);`,
    python: `import requests

res = requests.post(
    "${apiEndpoint}/api/analyze",
    json={"payload": "https://secure-login-verify.com/account"}
)
data = res.json()
print("Risk:", data["risk"])
print("Evidence:", data["evidence"])`,
  };

  function copySnippet() {
    void navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="api-modal-title">
            <Code2 size={18} style={{ color: "var(--accent)" }} />
            PhishLens AI — Developer API Access
          </h2>
          <button
            className="modal-close-btn"
            type="button"
            aria-label="Close API modal"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>
            Integrate automated pre-click phishing analysis into your pipelines, chatbots, browser tools, or SIEM workflows.
          </p>

          <div className="modal-tabs">
            <button
              className={activeTab === "text" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("text")}
            >
              cURL (Text/URL)
            </button>
            <button
              className={activeTab === "image" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("image")}
            >
              cURL (Screenshot)
            </button>
            <button
              className={activeTab === "javascript" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("javascript")}
            >
              JavaScript
            </button>
            <button
              className={activeTab === "python" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("python")}
            >
              Python
            </button>
          </div>

          <div className="code-box">
            <div className="code-box-header">
              <span>{activeTab.toUpperCase()} REQUEST</span>
              <button
                className="copy-code-btn"
                type="button"
                onClick={copySnippet}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <pre>{snippets[activeTab]}</pre>
          </div>

          <div className="api-meta-list">
            <div className="api-meta-item">
              <strong>Guaranteed 7-Field Response</strong>
              <span>
                Every request returns <code>risk</code> (<code>LOW</code>, <code>MEDIUM</code>, <code>HIGH</code>, <code>UNKNOWN</code>), <code>payloadType</code>, <code>evidence</code>, <code>deterministicObservations</code>, <code>uncertainty</code>, <code>recommendedAction</code>, and <code>disclaimer</code>.
              </span>
            </div>
            <div className="api-meta-item">
              <strong>Zero-Detonation Safety</strong>
              <span>
                URLs are parsed structurally and passed to Gemma 4 without navigation or DNS connection. Screenshots are processed in RAM only (max 2 MB).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
