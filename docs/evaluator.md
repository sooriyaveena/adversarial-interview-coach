# Evaluator Agent Specification

This specification documents the inner workings, scoring schemas, system contexts, and downstream effects of the **Evaluator Agent** and **Follow-Up Evaluator Agent** as implemented in `/src/server/agents.ts`.

---

## 1. Core Evaluator Agent (`runEvaluator`)

The Core Evaluator Agent assesses standard interview responses. It uses a highly structured JSON Schema with a **Groq-hosted model** (primary, via `groq-sdk`) to evaluate candidate submissions strictly and objectively. If `GROQ_API_KEY` is unavailable, the agent falls back to the legacy `gemini-3.5-flash` path, and finally to a static mock evaluation dataset if neither provider is configured.

### 1.1 Evaluator Context Mapping

To prevent hallucination and maintain focus, the Core Evaluator Agent is given a specific subset of the system state:

*   **Provided Context**:
    *   The exact `questionText` asked.
    *   The list of `expectedConcepts` defined when the question was generated.
    *   The current `topic` and `difficulty` level of the question.
    *   The candidate's raw submitted `answerText`.
*   **Excluded Context**:
    *   The candidate's resume and job description. This is **intentionally excluded** to ensure the answer is graded solely against the question asked, rather than the candidate's general background or qualifications.
    *   Prior chat history. This ensures that each evaluation is clean and free from bias or rolling score drag from earlier turns.

---

### 1.2 Evaluation Scoring Schema

The agent returns a structured JSON payload conforming to the following keys:

| Key | Data Type | Range | Evaluation Criteria |
| :--- | :--- | :--- | :--- |
| `technical_correctness` | Integer | `0-10` | Veracity and accuracy of technical assertions, definitions, and architectures. |
| `completeness` | Integer | `0-10` | Addresses all parts of the question and covers expected keywords or concepts. |
| `communication_clarity`| Integer | `0-10` | Structural logic, delivery pace, and professional articulation of the answer. |
| `relevance` | Integer | `0-10` | Directness of address, avoidance of generic filler, and staying on-topic. |
| `use_of_examples` | Integer | `0-10` | Integration of concrete professional experiences or scenarios to support claims. |
| `overall_score` | Number | `0-10` | A balanced, rolling assessment computed directly by the LLM. |
| `justification` | String | Max 3 sentences | Technical reasoning explaining the scores and identifying areas of weakness. |

### 1.3 Server-Side Score Modification
Although the LLM computes the raw `overall_score` based on its rubric, the server applies a strict modification in `server.ts` if helper utilities were used:
- **Hint Penalty**: If `question.hintRequested` is `true`, the server docks the overall score by **-1.0 point**:
  ```typescript
  let finalOverallScore = evaluation.overall_score;
  if (question.hintRequested) {
    finalOverallScore = Math.max(1, finalOverallScore - 1);
  }
  ```

---

## 2. Follow-Up Evaluator Agent (`runFollowUpEvaluator`)

When a candidate is presented with an adversarial challenge, their follow-up answer is handled by a separate agent: the **Follow-Up Evaluator Agent**. Like the Core Evaluator, it runs against Groq by default, with the legacy Gemini path and static mock dataset available as fallback tiers.

### 2.1 Context and Schema

The Follow-Up Evaluator is provided with the full challenge context:
- The `originalQuestion` and candidate's `originalAnswer`.
- The `adversarialFollowupQuestion` (challenge question).
- The candidate's `followupAnswerText`.

It returns a highly targeted assessment schema:
- **`pressure_handling`** (Integer, `0-10`): Evaluates how effectively the candidate defended their trade-offs, acknowledged limitations, or proposed realistic adaptations under direct pushback.
- **`justification`** (String): A concise explanation detailing their composure and depth under pressure.

---

## 3. Downstream Integrations and Scoring Flows

The evaluation scores directly drive two downstream systems: the **Adaptive Calibration Router** and the **Final Report Generator**. These downstream flows are provider-agnostic — they operate identically whichever tier (Groq, legacy Gemini, or mock) actually produced the scores.

### 3.1 Adaptive Calibration Router Flow
Directly after evaluation, the overall score is passed to the Router to determine the next turn's difficulty level:

```
                  [Evaluation Score Received]
                              |
               +--------------+--------------+
               |                             |
         Score >= 8.0                   Score < 5.0
               |                             |
     [Increase Difficulty]         [Decrease Difficulty]
     easy -> medium -> hard       hard -> medium -> easy
```

### 3.2 Final Report Synthesis
When the session is concluded (gracefully or ended early), the Report Generator aggregates the question metrics:
1. **Overall Preparation Score**:
   Calculated by summing all `scoreOverall` values from answered questions, dividing by the number of answered questions, and multiplying by 10 to produce a percentage score out of 100:
   $$\text{Overall Score} = \text{Round}\left(\frac{\sum \text{scoreOverall}}{\text{Answered Questions Count}} \times 10\right)$$
2. **Pressure Resilience Score**:
   Calculated by averaging the `pressure_handling` scores from the follow-up history list and multiplying by 10 to produce a percentage score out of 100.
3. **Qualitative Content Compilation**:
   Synthesizes and de-duplicates bullet points from the `feedbackStrengths`, `feedbackGaps`, and `feedbackImprovement` fields on each question to populate the final report's strengths and developmental recommendations sections.