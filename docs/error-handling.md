# Error-Handling Architecture and Fault Tolerance

This specification documents the concrete error-handling mechanisms, validation boundaries, and recovery pathways implemented in the application codebase.

---

## 1. Error-Handling Mapping Table

The following table maps every actual error-handling mechanism, its file path, failure coverage, and the resulting user or client experience:

| Category | File Location | Failure Handled | Mitigation / Recovery Strategy | User / Caller Experience |
| :--- | :--- | :--- | :--- | :--- |
| **Global API Errors** | `/server.ts` | Any unhandled exception thrown in API route handlers. | Global catch-all Express middleware intercepts error, logs to console, and sets JSON headers. | HTTP 500 JSON payload with `{ success: false, error: "..." }`. Safe from HTML stack trace leaks. |
| **API Router Boundary** | `/server.ts` | Unmatched request paths under `/api/*`. | Catch-all `/api/*` wildcard route intercepts mismatch before it falls through to Vite/SPA. | HTTP 404 JSON response outlining target method and endpoint missing. |
| **Authentication Gate** | `/server.ts` | Missing, expired, or tampered JWT token in HTTP request. | Token signature and structure checked via `verifyToken`. Failures clear invalid cookies. | HTTP 401 Unauthorized JSON block: `"Unauthorized - No token provided"` or `"Invalid session token"`. |
| **Resource Access Control** | `/server.ts` | Candidate attempts to view/edit another user's session or report. | Ownership assertion checks (`session.userId === req.user.id`). Warnings logged with security tags. | HTTP 403 Forbidden payload: `"Unauthorized access to session"` or `"Unauthorized access to report"`. |
| **Database Corruption** | `/src/server/db.ts` | Corrupt or unreadable JSON file inside `/data/db.json` on startup. | Try-catch in `load()` intercepts parse errors, logs details, and initializes an empty in-memory schema. | Transparent fallback. The application starts fresh without crashing. |
| **Upload File Format** | `/server.ts` | Candidates upload non-PDF, non-DOCX, or non-TXT files. | Multi-stage verification checks original extension, then inspects magic hex bytes for spoofed extensions. | HTTP 400 JSON error: `"Invalid file format. Only PDF, DOCX, TXT, and MD files are accepted."` |
| **Document Parse Failures** | `/server.ts` | Encrypted, malformed, or empty document files uploaded. | Segmented try-catch blocks for PDF, DOCX, and TXT parse operations. Catches specific parser library faults. | HTTP 400 JSON response advising: `"We couldn't read that PDF — try pasting text instead."` |
| **LLM Rate Limits (429)** | `/src/server/agents.ts` | Groq API rate exhaustion (`rate_limit_exceeded` / HTTP `429`) on the primary inference path. If the legacy Gemini fallback is active instead, its own `RESOURCE_EXHAUSTED` / `429` responses are handled by the same logic. | Exponential backoff logic automatically delays retries up to 3 times, doubling delay intervals, against whichever provider is currently active. | Seamless delay; if all retries fail, it falls back gracefully to a curated offline mock dataset. |
| **LLM Output Validation** | `/src/server/agents.ts` | LLM returns syntactically invalid JSON or misses required schema keys (applies equally whether the response came from Groq or the legacy Gemini fallback). | Corrective validation loop: catches missing fields, appends a correction prompt, and retries up to 3 times. | Seamless. If corrective loops fail completely, the system loads a safe canned response. |
| **LLM Network Timeout** | `/src/server/agents.ts` | Groq API calls hanging due to connection loss (or, when the legacy fallback is engaged, Gemini API calls hanging). | Uses a race condition pitting the API promise against a custom 15,000ms timeout rejection. | The request fails fast, triggers the local catch block, and loads mock datasets. |
| **Provider Fallback Chain** | `/src/server/agents.ts` | Groq is unreachable, unauthenticated, or exhausts retries. | Provider resolver automatically demotes the active call to the legacy Gemini path if `GEMINI_API_KEY` is configured; if that also fails or is absent, it demotes further to the static Mock dataset. | Seamless for the user in most cases; response quality/latency may shift depending on which tier ultimately served the request. |

---

## 2. Known Resilience Gaps

The following table lists known error-handling and security simplifications in the current MVP, which should be hardened in production:

| Target Component | Desired Production Behavior | Current MVP Simplification (Known Gap) | Impact / Risk |
| :--- | :--- | :--- | :--- |
| **API Rate Limiting** | Strict IP and session rate-limiting thresholds (e.g., using `express-rate-limit`) to prevent API abuse. | No rate limiting is configured on standard endpoints. | High risk of denial-of-service (DoS) or rapid API budget exhaustion. |
| **In-Memory Storage State** | Database operations should use asynchronous, atomic file-locking or transactional SQLite/Postgres. | Database writes are fully synchronous block writes via `fs.writeFileSync(DB_FILE, ...)`. | File locking conflicts or database corruption if multiple concurrent requests write to the JSON file. |
| **LLM Key Management** | Centralized server-side secret manager rotation and validation checks for both providers. | Direct read of `process.env.GROQ_API_KEY` (primary), with a secondary direct read of `process.env.GEMINI_API_KEY` (legacy fallback), and final fallback to mock responses. | Key exposure risks if env leaks; sudden transition to the fallback provider or to mock responses might confuse users or subtly shift answer quality without a visible signal. |
| **Input Sanitization** | Thorough HTML/script sanitization of submitted answers to prevent XSS. | Simple text validation with no script extraction checks. | Potential stored XSS in local JSON DB if user-submitted scripts are rendered in client markdown viewers. |