# Audit Trail Specification & Design

This specification outlines the security-relevant logging patterns implemented in the application, details the current limitations of in-memory logging, and defines a robust, lightweight schema to persist audit events directly within the existing JSON-file data store.

---

## 1. Existing Logging State

Currently, the application logs security-relevant, transactional, and LLM events directly to standard console streams. The following log patterns are fully implemented:

- **Resource Access Violations**:
  ```text
  [resource_access_denied] Unauthorized end-early attempt on session: ses_123 by user: usr_456
  ```
- **Document Extraction Tracking**:
  ```text
  [Upload] Successfully parsed file "my_resume.pdf" (8420 characters).
  ```
- **Adaptive Calibration Events**:
  ```text
  [Router Calibration] Input Score: 8.5, Current Difficulty: easy -> Next Difficulty: medium
  ```
- **Adversarial Follow-up Interrupts**:
  ```text
  [Follow-Up Triggered] Score: 9, Random: false. Generating adversarial challenge.
  ```

### Limitations of Current Logging
1. **Transient Lifecycle**: Logs exist only in stdout/stderr buffers. In a containerized environment (like Google Cloud Run), container restarts instantly wipe standard log buffers if external logs aren't aggregated.
2. **Non-Structured & Non-Queryable**: Console lines are free-form text strings, making programmatic search, threat auditing, and performance analysis difficult.
3. **No Database Persistence**: Critical events (like account deletions, failed log-in blocks, and privilege breaches) are not archived in `db.json`, preventing formal user compliance reporting.

---

## 2. Proposed Audit-Log Database Schema

To solve these gaps without introducing heavy database servers, we propose a lightweight schema that integrates into the existing `/src/server/db.ts` file-system storage layer.

### 2.1 Event Classifications
- `AUTH_SIGNUP`: New user registration.
- `AUTH_LOGIN_SUCCESS`: Successful user authentication.
- `AUTH_LOGIN_FAILED`: Failed passwords with tracking counters.
- `RESOURCE_BREACH_ATTEMPT`: Unauthorized requests on entities owned by other users.
- `DOCUMENT_INGEST`: File upload sizing and type parsing events.
- `ADVERSARIAL_CHALLENGE`: Follow-up triggers with target topics and scores.
- `ACCOUNT_DELETION`: User profiles and data wiped on request.

### 2.2 TypeScript Interface Definition
To implement this schema, we append the `AuditEvent` interface to `/src/server/db.ts`:

```typescript
export interface AuditEvent {
  id: string;          // Format: 'evt_' + base36 random string
  timestamp: string;   // ISO-8601 string
  userId: string | null; // Associated user, if authenticated
  eventType: "AUTH_SIGNUP" | "AUTH_LOGIN_SUCCESS" | "AUTH_LOGIN_FAILED" | "RESOURCE_BREACH_ATTEMPT" | "DOCUMENT_INGEST" | "ADVERSARIAL_CHALLENGE" | "ACCOUNT_DELETION";
  severity: "INFO" | "WARNING" | "CRITICAL";
  ipAddress: string;   // Sender remote address IP
  details: {
    message: string;
    resourceId?: string; // Target sessionId, questionId, reportId, etc.
    metadata?: Record<string, any>; // Extra metrics or failed counters
  };
}
```

### 2.3 Proposed JSON Database Integration
Inside the `DatabaseSchema` interface in `/src/server/db.ts`, we add an `auditLogs` array:

```json
{
  "users": [],
  "sessions": [],
  "questions": [],
  "reports": [],
  "embeddings": [],
  "auditLogs": [
    {
      "id": "evt_k7p9mxq2",
      "timestamp": "2026-07-06T04:10:00.000Z",
      "userId": "usr_99f8d1c0",
      "eventType": "RESOURCE_BREACH_ATTEMPT",
      "severity": "CRITICAL",
      "ipAddress": "192.168.1.50",
      "details": {
        "message": "User usr_99f8d1c0 attempted to modify session ses_2b3c4d owned by usr_88a7b6",
        "resourceId": "ses_2b3c4d"
      }
    }
  ]
}
```

### 2.4 DB Helper Additions
We propose implementing standard, fast transactional helper methods on `LocalDB` in `/src/server/db.ts`:

```typescript
class LocalDB {
  // ... existing code ...
  
  createAuditLog(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const newEvent: AuditEvent = {
      ...event,
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs = this.data.auditLogs || [];
    this.data.auditLogs.push(newEvent);
    this.save();
    return newEvent;
  }

  getAuditLogsByUserId(userId: string): AuditEvent[] {
    this.data.auditLogs = this.data.auditLogs || [];
    return this.data.auditLogs.filter(log => log.userId === userId);
  }
}
```
