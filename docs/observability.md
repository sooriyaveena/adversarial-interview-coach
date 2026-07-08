# Observability & Monitoring Specification

This specification documents the current state of diagnostic telemetry and outlines low-overhead, practical monitoring implementations sized for the application's runtime.

---

## 1. Current Telemetry Architecture

Today, observability is primarily output-bound, utilizing node console stdout/stderr. These logs map key stages in the session loop and document lifecycle:

- **LLM Diagnostic Metrics**:
  ```text
  [Groq API 429 Rate Limit] Active. Backing off for 1000ms before retrying...
  [Agent Validation Alert] Corrective attempt 1 failed. Error: JSON missing required fields: question...
  [Agent Validation Critical] Corrective retries exhausted. Using stable fallback state.
  [Provider Fallback] Groq unavailable. Demoting to legacy Gemini path for this call.
  ```
- **RAG Subsystem Metrics**:
  ```text
  Ingesting jd for session ses_abc. Chunks generated: 14
  ```

### Structural Strengths
- Logs are prefixed cleanly with bracket labels (e.g. `[Upload]`, `[Router Calibration]`, `[Groq API 429 Rate Limit]`), which simplifies parsing and filtering in external log aggregators like Google Cloud Logging (Stackdriver) or Kibana.
- Fallback activation is clearly logged, making it easy to identify when the application has demoted from Groq to the legacy Gemini path, or dropped further into mock mode.

### Structural Gaps
- **No Request-Level Latency Measurements**: The server does not track or report execution times for heavy API endpoints (such as vector ingestion or multi-agent evaluations), making performance monitoring difficult.
- **No Error Rate Metrics**: It is difficult to measure the proportion of failed API calls or fallback trigger events without manually reading log files.
- **No Per-Provider Breakdown**: Current logs don't distinguish, in aggregate, how often Groq versus the legacy Gemini fallback actually served a given request — only individual line-by-line events are visible.

---

## 2. Low-Effort Observability Recommendations

To implement robust monitoring without external sidecars, we recommend adding 3 lightweight, native helper systems to the existing Express controller and agent module:

### Improvement 1: Request Latency Middleware
We recommend adding a custom, low-overhead performance-measuring middleware inside `server.ts` to log route execution times:

```typescript
// server.ts
import { performance } from "perf_hooks";

app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[HTTP Metrics] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
  });
  next();
});
```

### Improvement 2: Local Telemetry Counter state
To monitor the health of LLM connections, we propose adding a lightweight, in-memory counter object in `agents.ts` to track failures and fallback usage — broken out per provider so Groq's primary-path health can be distinguished from legacy Gemini fallback activity:

```typescript
// src/server/agents.ts
export const TelemetryMetrics = {
  groqCallsTotal: 0,
  groqCallsFailed: 0,
  geminiFallbackCallsTotal: 0,
  geminiFallbackCallsFailed: 0,
  mockFallbackActivations: 0,
  correctiveRetriesTotal: 0
};

// Increment metrics in agent workflows
TelemetryMetrics.groqCallsTotal++;
if (usedGeminiFallback) {
  TelemetryMetrics.geminiFallbackCallsTotal++;
}
if (usedMockFallback) {
  TelemetryMetrics.mockFallbackActivations++;
}
```
Exposing these in-memory metrics on a secure endpoint (e.g., `GET /api/metrics`) allows standard scrapers (like Prometheus or Google Cloud Monitoring) to track performance metrics in real time, including how often traffic falls back off the primary Groq path.

### Improvement 3: Structured JSON Logging
By default, the console outputs raw text strings. Converting these to structured JSON in production environments allows cloud providers (like Google Cloud Run or GKE) to parse severities and group traces automatically:

```typescript
// Proposed helper function for production logging
function structuredLog(severity: "INFO" | "WARNING" | "ERROR", tag: string, message: string, metadata: object = {}) {
  console.log(JSON.stringify({
    severity,
    time: new Date().toISOString(),
    message: `[${tag}] ${message}`,
    ...metadata
  }));
}

// Usage
structuredLog("WARNING", "Groq API 429 Rate Limit", "Active. Backing off for retry", { delayMs: 1000, provider: "groq" });
structuredLog("WARNING", "Provider Fallback", "Groq unavailable, demoting to legacy Gemini path", { provider: "gemini-legacy" });
```
This is a robust, clean approach that ensures high observability with almost zero performance overhead.