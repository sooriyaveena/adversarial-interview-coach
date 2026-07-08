# Adversarial Interview Coach

An elite, high-fidelity technical and behavioral simulation platform designed for candidates preparing for high-bar engineering and leadership roles. Unlike generic interview tools, the **Adversarial Interview Coach** challenges candidates using standard technical evaluations, dynamic topic calibration, real-time feedback loops, and pointed **adversarial pushbacks** that stress-test technical trade-offs, architecture limits, and composure under pressure.

---

## 1. Technical Stack

| Component | Library / Framework | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 / Vite | Fast, responsive single-page application |
| **Styles & Icons** | Tailwind CSS / Lucide React | Clean, high-contrast, modern visual layout |
| **Backend Server** | Node.js / Express | Monolithic controller, static assets, and session routing |
| **AI SDK (Primary)** | `groq-sdk` | Official Groq SDK powering all interview generation, adversarial pushback, scoring, and coaching via ultra-low-latency LPU inference (Llama 3.x / Mixtral models) |
| **AI SDK (Legacy Fallback)** | `@google/genai` (v2.4.0) | Optional Gemini integration retained only as a legacy fallback path — used solely if `GROQ_API_KEY` is absent, or for embeddings/Google Search Grounding, which Groq does not natively provide |
| **Document Parsers**| `pdf-parse` / `mammoth` | Multi-format text extraction (PDF / DOCX) |
| **Report Export** | `pdfkit` | Low-overhead server-side streaming PDF compilation |
| **Data Storage** | Native `fs` JSON Database | Lightweight transactional persistent data layer |
| **Test Engine** | Native `node:test` | Standard Node.js assertion and unit test runner |

---

## 2. Core Capabilities & Features

*   **Security & Auth Portal**: Secure, offline-first user signup and login protected by **PBKDF2 SHA-512** password hashing and custom stateful session tracking via lightweight, tamper-proof **HMAC-SHA256 JWT tokens**.
*   **Context-Rich RAG Ingestion**: Multipart document parser supporting PDFs, Word documents (`.docx`), and markdown/plain text. Inspects files for raw magic hex bytes to prevent extension spoofing, chunking and indexing text nodes. Embeddings are generated via a lightweight local/open embedding model by default; the legacy `gemini-embedding-2-preview` path remains available as an optional fallback for teams that prefer Gemini-based vector generation, with local cosine similarity searches either way.
*   **Industry Benchmarking**: Integrates standard expectations and trending skill stacks via Groq-driven synthesis of current role/skill data. If deeper live web grounding is required, the legacy Gemini path can optionally be enabled to use Google Search Grounding, since Groq does not offer a native grounding feature.
*   **Adversarial Challenge Engine**: Delivers pointed, context-aware pushbacks simulating critical interviewers, generated through Groq's high-speed inference. It challenges candidates on architectural constraints, network partitions, scalability edge cases, and trade-offs.
*   **Adaptive Calibration Engine**: Evaluates answers on a 10-point scale across accuracy, completeness, clarity, relevance, and example usage, automatically shifting interview difficulty (`easy` -> `medium` -> `hard`) to match candidate capabilities — all scored via Groq-hosted models for near-instant feedback loops.
*   **Resilience & Composure Grader**: Intercepts follow-up responses and scores composure under pressure (`pressure_handling` index).
*   **Actionable Remediation Reports**: Compiles session evaluations into a comprehensive qualitative preparation report complete with interactive graphs and downloadable printable PDFs via `pdfkit`.

---

## 3. Local Setup & Installation

### Prerequisites
*   **Node.js**: Version 18.x or greater is required (utilizes native TypeScript type stripping and built-in unit test runner).
*   **Groq API Key**: An active API key is required to connect to Groq-hosted models (e.g. Llama 3.x / Mixtral) for interview generation, evaluation, and coaching. This is the primary and recommended provider.
*   **Gemini API Key (optional, legacy)**: Only needed if you want to enable the legacy fallback path for embeddings, Google Search Grounding, or as a backup LLM provider when Groq is unavailable.

### 1. Clone & Install Dependencies
```bash
# Install core packages from package.json
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root matching the schema in `.env.example`:
```env
# Required for Groq AI API (primary provider)
GROQ_API_KEY="your_real_groq_api_key_here"

# Optional — only needed to enable the legacy Gemini fallback path
# (embeddings, Google Search Grounding, or backup LLM inference)
GEMINI_API_KEY="your_real_gemini_api_key_here"

# The hosted URL or local endpoint (e.g. http://localhost:3000)
APP_URL="http://localhost:3000"
```

### 3. Run the Development Server
```bash
# Starts the Express development backend on http://localhost:3000
npm run dev
```

### 4. Build and Start for Production
```bash
# Compile client assets and bundle backend TypeScript via esbuild
npm run build

# Boot the compiled production server
npm run start
```

---

## 4. Architectural Verification (Testing)

The codebase includes a lightweight, native test suite verifying crypto hashing, token signing, RAG splitter chunks, vector comparisons, and database transactions:

```bash
# Run unit tests via Node.js built-in test runner
npm run test
```

---

## 5. Offline Fallback / Mock Mode

If neither a `GROQ_API_KEY` nor a `GEMINI_API_KEY` environment variable is defined, the application gracefully activates **Mock Fallback Mode**:
- **Ingestion**: File parses succeed and generate pseudo-embeddings based on mathematical sine-wave functions (`Math.sin()`), preserving RAG system workflows.
- **Interviews**: Questions, evaluation metrics, coaching suggestions, and benchmark reports load from curated static datasets mapped to target topics. This maintains a functional, testable client interface for demo and local development.

**Provider resolution order**: `GROQ_API_KEY` (primary) → `GEMINI_API_KEY` (legacy fallback, if present) → static Mock Fallback dataset.

---

## 6. Folder Structure

```text
├── server.ts                 # Main Express server, multipart parsers, & session routes
├── package.json              # Applet configurations, scripts, and dependencies
├── data/
│   └── db.json               # Transactional JSON-file database state
├── docs/                     # Comprehensive Technical & Diagnostic Specifications
│   ├── architecture.md       # High-level architecture and Mermaid layouts
│   ├── workflow.md           # Session loop state-machines & calibration maps
│   ├── error-handling.md     # Error mapping directories and resilience plans
│   ├── testing.md            # Diagnostic QA test plans and automated runs
│   ├── audit-trail.md        # Security auditing schemas and proposed models
│   ├── observability.md      # Performance monitoring and log proposals
│   ├── evaluator.md          # Evaluation algorithms and down-stream scoring
│   └── quality-scorecard.md  # honest capability matrix assessment
├── src/
│   ├── main.tsx              # React UI frontend mounting index
│   ├── App.tsx                # Primary interface, terminal loops, and setup gates
│   ├── index.css             # Tailwind styling and font imports
│   └── server/               # Backend logic and RAG modules
│       ├── db.ts             # File database access controllers
│       ├── crypto.ts         # PBKDF2 hashing & HMAC JWT signers
│       ├── rag.ts            # Recursive text splits & similarity equations
│       ├── agents.ts         # Multi-agent systems, prompting (Groq primary, Gemini legacy fallback), & validations
│       └── tests/
│           └── unit.test.ts  # Native Node.js unit tests
```

---

## 7. Known MVP Limitations

*   **File Database Lockings**: Database writes are fully synchronous writes using `fs.writeFileSync`. Under high concurrent load, this may result in file access conflicts.
*   **Transient Security Audit Trail**: Security-relevant logs (e.g., failed login counters or access violations) are written to stdout and not stored persistently, making them volatile on server restarts.
*   **Local PDF Kit Multi-Pass limits**: PDF generation does not calculate dynamic heights for exceptionally long answers, resulting in hard layout page breaks.
*   **No Native Groq Embeddings/Grounding**: Groq does not offer first-party embeddings or web-search grounding APIs, so those specific features fall back to the legacy Gemini path (or a local embedding model) when enabled.

---

## 8. License & Author
*   **Author**: Workspace Candidate / Capstone Project
*   **License**: MIT License - Free to distribute and modify for learning, evaluation, and recruitment.