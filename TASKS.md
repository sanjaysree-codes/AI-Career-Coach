# Requirements checklist

Status vocabulary: Not Started, In Progress, Implemented, Tested, Verified. “Implemented” means code exists; it does not imply that external services or integration tests have passed.

| Requirement | Status | Notes |
|---|---|---|
| Responsive landing page and authenticated navigation | Implemented | React Router shell; responsive CSS |
| Registration, login, logout, protected API | Implemented | bcrypt, JWT in HTTP-only cookie, ownership queries |
| Mongo persistence and dashboard progress | Implemented | Requires MongoDB connection to verify |
| PDF/DOCX validation, extraction, 5 MB limit | Implemented | Image-only PDFs rejected; OCR not included |
| Gemini resume analysis and validated response | Implemented | Requires `GEMINI_API_KEY`; readability schema checks are present |
| Five simulated company tracks | Implemented | Server-owned config; no unapproved logos |
| Aptitude timer, persisted answers, server scoring and feedback | In Progress | Fifteen original practice items and server scoring are implemented; timer expiry is currently initiated by the client |
| Secure coding round with actual judged result | In Progress | Original Two Sum prompt and hidden cases are stored server-side; a sandboxed service must be configured at `CODE_JUDGE_URL` |
| Resume-based HR interview and feedback | Implemented | Requires Gemini; correctly gated after coding completion |
| Final report weighting, persistence, PDF | Implemented | Requires all round results; requires runtime verification |
| History and profile | Implemented | Requires MongoDB |
| Personalized study plans and task tracking | Implemented | Gemini daily plan uses resume/assessment results; new attempts mark the plan stale |
| Advanced analytics and attempt comparisons | Implemented | Analytics derive from persisted resume scores, attempts, HR sessions, and reports |
| AI resume builder and PDF export | Implemented | Drafts persist; import/suggestions use Gemini; edits require per-suggestion approval |
| Optional voice HR answers | Implemented | Browser speech recognition produces an editable text answer; audio is not uploaded or stored |
| Scoring unit tests, client build, API smoke checks | Tested | Eight backend tests pass; production client build succeeds; health and protected-route smoke checks pass |
| Full workflow and Mongo/Gemini/judge integration | Not Started | MongoDB is not listening locally; Gemini key and secure judge service are not configured |
