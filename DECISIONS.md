# Architecture decisions

1. **HTTP-only cookie JWT:** The browser never stores the authorization token in local storage. Production deployments must set `COOKIE_SECURE=true` and use HTTPS.
2. **MongoDB is authoritative:** User, resume, attempt, interview, and report data are persisted with Mongoose. There is no browser-storage fallback that pretends to save preparation progress.
3. **Resume file storage:** Files are stored outside MongoDB in a private local upload directory with random names and restrictive permissions. Production multi-instance deployment should use private object storage and a retention/deletion policy.
4. **Gemini through one backend service:** All AI calls route through `server/src/ai.js`; content from resumes and answers is treated as untrusted prompt data. AI responses are schema-checked before save.
5. **No local code execution:** The Express server refuses coding scoring without a trusted judge endpoint. An original Two Sum problem and hidden test cases are provided, but the workflow is gated until a trusted judge adapter is configured.
6. **Company labels:** Company pathways are simulated practice profiles and do not claim to reproduce actual proprietary hiring processes or verified historical questions.
7. **Voice answers:** Use the browser Web Speech Recognition API when available. The app submits only the reviewed transcript to the existing interview endpoint; it does not send or store recorded audio. Text entry remains available.
8. **Resume suggestions:** Gemini output is stored as pending suggestions. A saved resume draft changes only after the candidate approves an individual suggestion.
