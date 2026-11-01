# Deploying the API to Vercel

Set the Vercel project's Root Directory to `server`. `api/[...path].js` forwards API requests to the existing Express app, and `vercel.json` allows up to 60 seconds for functions that call Gemini or the external code judge. Local development remains `npm run dev` from this directory.

Configure `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `CLIENT_URL` in the Vercel project's Environment Variables. Set `COOKIE_SECURE=true` for HTTPS deployments. Keep these values in Vercel's environment settings; do not commit them. The serverless handler caches its MongoDB connection promise and reuses Mongoose's connection when an invocation is warm. `/api/health` returns `{ "ok": true }` without requiring MongoDB to be available.

## Resume uploads

Vercel function filesystems are temporary. In Vercel, uploads are parsed and analyzed in memory, and extracted resume text and analysis are stored in MongoDB. The original PDF/DOCX is not persisted; the upload response marks this as `sourceFileStored: false`, and the UI reports it. Local deployments continue to save the original file under `UPLOAD_DIR` (or `./uploads`). To retain originals in production, add durable object storage and replace the Vercel in-memory-only branch with that provider.

## Coding judge

Vercel functions cannot run the local Docker daemon used by `CODE_RUNNER=local`. Configure `CODE_RUNNER=judge0` and `CODE_JUDGE_URL` (and `CODE_JUDGE_API_KEY` when required by the judge) to keep code runs and submissions enabled. If that configuration is missing, coding endpoints return an explicit service error; Docker is not silently attempted in Vercel. Local development keeps the Docker runner by default.
