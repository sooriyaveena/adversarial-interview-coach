# Test Cases and Verification Plan

This document details the test scenarios, QA checklists, verification plans, and native automated test scripts implemented in the workspace.

---

## 1. QA Test Cases Map

The following matrix covers validation checks mapping to the core routes and components. It indicates which tests are **automated** (implemented in code) and which are **documentation-only / manual**:

| ID | Focus Area | Automated? | Precondition | Steps / Inputs | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | User Signup & Hashing | **YES** | Database is online. | Register user with email and secure password. | User record is created with a PBKDF2 hash containing the `:` separator. | High |
| **TC-02** | Password Verification | **YES** | User exists in DB. | 1. Attempt login with correct password.<br>2. Attempt login with wrong password. | 1. Verification returns `true`. Token issued.<br>2. Verification returns `false`. | High |
| **TC-03** | Custom JWT Token | **YES** | Valid user payload. | 1. Call `createToken()`. Verify verification succeeds.<br>2. Tamper with token. Verify verification fails. | 1. Payload matches original values.<br>2. `verifyToken` returns `null`. | High |
| **TC-04** | Document Ingestion | **YES** | File uploaded. | Call `recursiveCharacterSplit()` with long text, chunk size 50, overlap 10. | Chunks are split on separators, size is kept within limits, text overlaps correctly. | Medium |
| **TC-05** | Vector Match (Cosine) | **YES** | Similarity calculation. | Run `cosineSimilarity()` with:<br>1. Identical vectors.<br>2. Orthogonal vectors. | 1. Cosine similarity yields `1.0`.<br>2. Cosine similarity yields `0.0`. | Medium |
| **TC-06** | DB User CRUD | **YES** | Clean DB state. | Call `db.createUser()`, then `db.getUserByEmail()`. | User is successfully persisted and retrieved. Email matches case-insensitive. | High |
| **TC-07** | Upload Magic Checks | No (Manual) | Multer in memory. | Upload a `.txt` file renamed to `.pdf`. | Validator flags mismatched headers; returns `HTTP 400` upload format error. | High |
| **TC-08** | Access Control Guard | No (Manual) | Two users exist. | User B attempts to access User A's session: `GET /api/sessions/:idA`. | Returns `HTTP 403 Forbidden` with diagnostic console warnings. | High |
| **TC-09** | Adaptive Routing Loop | No (Manual) | Active interview. | Submit answer yielding overall score `>= 8`, then `< 5`. | Calibration Engine escalates difficulty on high score and lowers it on low score. | Medium |
| **TC-10** | Adversarial Trigger | No (Manual) | Active session. | Answer standard question. Mock rolling dice or scoring `>= 7`. | Session interrupts normal sequence, triggers Follow-up Agent, sets flag `true`. | Medium |
| **TC-11** | Pressure Assessment | No (Manual) | Awaiting follow-up. | Submit reply to adversarial question. | Evaluates answers on a composure/pressure handling scale. Clears follow-up flag. | Medium |
| **TC-12** | Hint Score Penalty | No (Manual) | Active question. | Request hint, then answer question. | Hint text is shown. Score gets capped or docked by `1.0` point. | Low |
| **TC-13** | Report PDF Export | No (Manual) | Concluded session. | Request `GET /api/reports/:id/pdf`. | Pipes a styled double-pass binary stream; content type set to `application/pdf`. | High |
| **TC-14** | API Fallback Shield | No (Manual) | Offline dev mode. | Access missing API endpoint `/api/not-exist`. | Intercepts route, prevents fallback to SPA index.html, returns `HTTP 404 JSON`. | High |
| **TC-15** | Account Deletion | No (Manual) | Active user in DB. | Trigger `DELETE /api/users/profile`. | Execution wipes user credentials, sessions, questions, and embedding nodes. | High |
| **TC-16** | Provider Fallback Resilience | No (Manual) | `GROQ_API_KEY` revoked/absent. | 1. Trigger any agent interview question with only `GEMINI_API_KEY` configured.<br>2. Repeat with both keys revoked/absent. | 1. Resolver demotes from Groq to the legacy Gemini path and continues serving live-generated content.<br>2. Resolver demotes fully to static mock data, serving predefined high-quality mock content safely. | Medium |

---

## 2. Running Automated Tests

A native automated unit test suite has been implemented in `/src/server/tests/unit.test.ts` using **Node.js's built-in test runner** (`node:test`) and assertion library (`node:assert`). This avoids external overhead while validating core system modules.

Note: the current automated suite covers crypto, RAG splitting/similarity, and DB CRUD only — it does **not** include automated coverage for the Groq/Gemini/mock provider resolution chain (TC-16), which remains a manual verification step.

### 2.1 Execution Instructions

To execute the automated test suite locally:

```bash
# Execute the native test runner through tsx ts-importing
npm run test
```

### 2.2 Test Run Verification Output

```text
> react-example@0.0.0 test
> node --import tsx --test src/server/tests/unit.test.ts

TAP version 13
# Subtest: Crypto Module - Password Hashing
ok 1 - Crypto Module - Password Hashing
  ---
  duration_ms: 4.170866
  type: 'test'
  ...
# Subtest: Crypto Module - Custom JWT Creation and Verification
ok 2 - Crypto Module - Custom JWT Creation and Verification
  ---
  duration_ms: 0.949328
  type: 'test'
  ...
# Subtest: RAG Module - Custom Recursive Text Splitter
ok 3 - RAG Module - Custom Recursive Text Splitter
  ---
  duration_ms: 0.555354
  type: 'test'
  ...
# Subtest: RAG Module - Cosine Similarity Engine
ok 4 - RAG Module - Cosine Similarity Engine
  ---
  duration_ms: 0.25841
  type: 'test'
  ...
# Subtest: Database Module - User Management
ok 5 - Database Module - User Management
  ---
  duration_ms: 2.134669
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 743.896185
```