# AI Career Coach — Master Specification

## Single Source of Truth for Spec-Driven Development

**Project Name:** AI Career Coach
**Project Type:** AI-powered placement preparation platform
**Development Approach:** Spec-Driven Development (SDD)
**Frontend:** React.js
**Backend:** Node.js + Express.js
**Database:** MongoDB
**AI Provider:** Google Gemini API
**Primary Users:** Students, freshers, job seekers, and placement candidates
**Primary Goal:** Help users prepare for company placements through resume analysis, aptitude tests, coding interviews, and resume-based HR interviews.

---

# 1. Product Overview

AI Career Coach is a web application that helps candidates prepare for placements by simulating a structured recruitment process similar to those used by major technology companies.

The platform guides the user through four main stages:

1. **Resume Analysis:** Upload a resume, receive AI-generated feedback, identify missing information, and improve the resume's content and formatting.
2. **Company Selection:** Choose a target company from a list of five or more major technology companies.
3. **Technical Placement Preparation:** Complete the selected company's aptitude, coding, and HR interview rounds in sequence.
4. **Final Evaluation:** Receive a consolidated performance report with scores, strengths, weaknesses, and recommended next steps.

The system uses Gemini AI to analyze resumes, generate questions, evaluate answers, provide explanations, and personalize preparation.

The application must work as a real, full-stack product. Buttons, forms, uploads, progress indicators, assessments, database operations, and feedback must be functional rather than decorative.

## 1.1 Core Product Principle

The application must guide the user from resume analysis to a final placement-readiness report.

The workflow must be sequential:

Resume Analysis → Company Selection → Aptitude Round → Coding Round → HR Interview → Final Report.

A user must not be able to mark a round as completed without satisfying that round's completion requirements.

# 2. Product Objectives

The platform must:

* Help users understand and improve their resumes.
* Evaluate resume formatting, readability, content, and relevance to a target role.
* Provide company-specific preparation paths.
* Support aptitude, coding, and HR interview simulations.
* Generate AI-powered questions using Gemini.
* Use curated historical questions where reliable data is available.
* Provide detailed feedback after each assessment.
* Track progress across all rounds.
* Personalize the final HR round using the uploaded resume.
* Generate a consolidated placement-readiness report.
* Allow users to revisit their results and continue incomplete preparation.

# 3. Target Users

## 3.1 Students

Students preparing for campus placements who need structured preparation and feedback.

## 3.2 Freshers

Candidates applying to entry-level software development, engineering, and other technology roles.

## 3.3 Job Seekers

Candidates preparing for interviews at specific companies and wanting to identify skill gaps.

## 3.4 Primary User Story

"As a placement candidate, I want to upload my resume, select a target company, complete its preparation rounds, receive meaningful feedback, and understand my readiness for interviews so that I can improve my chances of performing well in actual placements."

# 4. Technology Stack

| Layer                     | Technology                                       | Responsibility                         |
| ------------------------- | ------------------------------------------------ | -------------------------------------- |
| Frontend                  | React.js                                         | UI, navigation, forms, dashboards      |
| Routing                   | React Router                                     | Page navigation and protected routes   |
| Styling                   | CSS or a consistent component styling system     | Responsive UI                          |
| Backend                   | Node.js                                          | Server-side runtime                    |
| API framework             | Express.js                                       | REST API and business logic            |
| Database                  | MongoDB                                          | Users, resumes, assessments, results   |
| ODM                       | Mongoose                                         | Database schemas and validation        |
| AI                        | Google Gemini API                                | Resume analysis, questions, evaluation |
| Authentication            | JWT-based authentication                         | Secure user sessions                   |
| Password security         | bcrypt                                           | Password hashing                       |
| File uploads              | Multer or equivalent                             | Resume upload processing               |
| Resume parsing            | PDF/DOCX parsing libraries                       | Extract resume text                    |
| Coding evaluation         | Sandboxed execution service or trusted judge API | Execute submitted code                 |
| Environment configuration | Environment variables                            | API keys and secrets                   |
| Deployment                | Frontend and backend deployment services         | Production hosting                     |

### Technology rules

1. Use JavaScript consistently unless TypeScript is explicitly introduced as a project-wide decision.
2. Use the MERN stack as the foundation.
3. Do not expose Gemini API keys in the browser.
4. All Gemini requests must go through the backend.
5. Use MongoDB to persist completed assessments and progress.
6. Do not store uploaded resume files as large binary documents in MongoDB by default. Store files in appropriate storage and save their metadata and extracted text in MongoDB.
7. Do not use browser-only state as the permanent source of truth for user progress.
8. Do not simulate code execution by asking Gemini whether code is correct. Use an actual code execution or judging service.

# 5. Application Navigation

The application must contain the following primary routes.

| Route                        | Page                             | Authentication |
| ---------------------------- | -------------------------------- | -------------- |
| `/`                          | Landing page                     | Public         |
| `/register`                  | Registration                     | Public         |
| `/login`                     | Login                            | Public         |
| `/dashboard`                 | User dashboard                   | Required       |
| `/resume-analysis`           | Resume upload and analysis       | Required       |
| `/resume-analysis/:resumeId` | Resume feedback                  | Required       |
| `/companies`                 | Company selection                | Required       |
| `/companies/:companyId`      | Company preparation overview     | Required       |
| `/assessments/:assessmentId` | Aptitude or coding assessment    | Required       |
| `/interviews/:sessionId`     | HR interview session             | Required       |
| `/results/:resultId`         | Round or final results           | Required       |
| `/history`                   | Previous assessments and reports | Required       |
| `/profile`                   | Profile and settings             | Required       |
| `*`                          | Not-found page                   | As appropriate |

Routes may be adjusted during implementation if necessary, but the feature boundaries and navigation behavior must remain consistent.

# 6. Main User Journey

## Step 1: Register or Log In

The user creates an account using their name, email, and password, or logs in to an existing account.

Requirements:

* Validate email format.
* Require a secure password.
* Hash passwords before storing them.
* Prevent duplicate account registration for the same email.
* Display understandable validation and authentication errors.
* Provide logout functionality.
* Protect authenticated routes.
* Ensure each user can access only their own resumes, sessions, and reports.

After successful login, redirect the user to the dashboard.

## Step 2: Dashboard

The dashboard is the user's central workspace.

It must display:

* Welcome message.
* Resume analysis status.
* Latest resume score, when available.
* Target company.
* Overall placement preparation progress.
* Completed and pending rounds.
* Recent assessment results.
* Recommended next action.
* Quick access to resume analysis and company selection.

Example progress display:

* Resume Analysis: Completed
* Company Selection: Completed
* Aptitude: Completed
* Coding: In Progress
* HR Interview: Locked
* Final Report: Locked

Progress must come from saved backend data.

A newly registered user must see an appropriate empty state and a clear action to begin resume analysis.

## Step 3: Resume Upload

The user uploads their resume before starting company preparation.

### Supported formats

* PDF
* DOCX

### Upload requirements

* Validate the file extension and actual file content.
* Enforce a configurable file-size limit, initially 5 MB.
* Reject unsupported, corrupted, empty, or unreadable files.
* Extract text from the uploaded document.
* Handle scanned PDFs that require OCR as a separate capability; do not silently pretend that image-only PDFs were parsed successfully.
* Show upload progress and useful error messages.
* Let the user replace or delete their uploaded resume.
* Associate each resume with its owner.
* Avoid logging raw resume contents or sensitive personal information.

The backend must parse the document and send the extracted text to Gemini for analysis.

## Step 4: Resume Analysis

Gemini must evaluate the uploaded resume using a structured analysis prompt.

The analysis must contain the following sections.

### A. Overall Resume Score

Return an overall score from 0 to 100.

The score represents the resume's quality under the application's evaluation rubric. It is not a guaranteed ATS score or a prediction of selection by a real employer.

### B. Formatting and Readability

Evaluate:

* Font consistency.
* Font size and readability, where the document format makes this information available.
* Heading consistency.
* Section organization.
* Bullet-point consistency.
* Spacing and alignment, where available.
* Page structure and excessive length.
* Use of tables, columns, images, or other elements that might interfere with parsing.
* Contact information placement.

Important limitation: If the text parser cannot inspect actual font sizes, colors, margins, or layout, the AI must not claim to have measured them. Use a document-layout parser or additional inspection capability when visual formatting analysis is required.

### C. Resume Content

Evaluate:

* Contact information completeness.
* Professional summary or objective.
* Technical skills.
* Education.
* Projects.
* Internships and work experience.
* Certifications, when applicable.
* Achievements and measurable results.
* Grammar and spelling.
* Relevance to the selected job role.
* Use of action verbs.
* Clarity and impact of bullet points.

Do not penalize a fresher simply for having no full-time work experience.

### D. Section-by-Section Feedback

For every relevant section, return:

* Section name.
* Current strengths.
* Problems identified.
* Suggested improvements.
* Example rewritten content, where useful.
* Priority: High, Medium, or Low.

### E. Recommended Formatting

Provide actionable guidance such as:

* Use a consistent, readable font.
* Use a clear hierarchy for section headings.
* Keep spacing and alignment consistent.
* Prefer simple layouts that are easy for resume parsers to read.
* Use concise, achievement-focused bullet points.
* Include measurable project outcomes when they can be supported by real information.
* Avoid decorative elements that reduce readability.

These are recommendations, not rigid universal rules. The best resume length and layout depend on the candidate's experience and target role.

### F. Improvement Plan

Generate the top five recommended improvements, ordered by priority.

### G. Missing Information

Identify potentially missing sections or details, but distinguish between information that is genuinely absent and information that may not be necessary for the candidate.

Never invent a candidate's qualifications, achievements, employment history, or technical skills.

### Resume analysis output contract

The backend must validate Gemini's response against a defined JSON schema before storing it.

Conceptual response structure:

{
"overallScore": 78,
"summary": "Resume summary",
"formatting": {
"score": 80,
"findings": [],
"recommendations": []
},
"content": {
"score": 76,
"strengths": [],
"weaknesses": []
},
"sections": [],
"topImprovements": [],
"missingInformation": [],
"targetRole": "Software Developer"
}

This is an illustrative contract. The implementation must define and validate the complete schema, including field types, score bounds, required properties, and error handling.

## Step 5: Company Selection

After the user reviews their resume analysis, show a company selection page.

Initially support these five companies:

1. Google
2. Amazon
3. Microsoft
4. Meta
5. Apple

These are configurable company profiles, not a claim that their actual recruitment processes are identical.

Each company card should display:

* Company name and logo.
* Brief company description.
* Available preparation tracks.
* Aptitude, coding, and HR round descriptions.
* Progress for the selected preparation path.
* Start or Continue button.

The application must not use copyrighted logos or branding assets without appropriate permission. Use approved assets or text-based branding placeholders.

### Company-specific configuration

Each company must have configurable data for:

* Supported roles.
* Preparation track.
* Aptitude question categories.
* Coding topics and difficulty.
* HR question categories.
* Question counts and assessment duration.
* Scoring rules.
* Historical questions available in the curated question bank.

If actual company-specific details are unavailable, label the experience as a simulated preparation track inspired by common industry interview formats.

Do not state that a question was asked in a real interview unless that claim is supported by a reliable source.

# 7. Company Preparation Workflow

The selected company follows a three-round preparation process.

## Round 1: Aptitude

The user must complete the aptitude round before unlocking coding.

### Question categories

* Quantitative aptitude.
* Logical reasoning.
* Verbal reasoning.
* Data interpretation.
* Pattern recognition.

### Question format

Support multiple-choice questions with:

* Question text.
* Four answer options by default.
* One correct answer for standard single-answer questions.
* Optional diagrams or data tables where supported.
* Difficulty level.
* Topic.
* Time limit.
* Explanation.

### Assessment behavior

1. Generate or retrieve a set of aptitude questions.
2. Display one question at a time, or a clearly organized question list.
3. Allow the user to select an answer.
4. Provide next and previous navigation.
5. Display a countdown timer.
6. Preserve the current attempt during normal navigation.
7. Prevent duplicate submissions and invalid answer updates.
8. Submit automatically when the timer expires.
9. Evaluate the submitted answers on the backend.
10. Save the result.
11. Display detailed feedback.

The default assessment configuration should be 15 questions with a 20-minute time limit. Both values must be configurable by preparation track.

### Aptitude feedback

Display:

* Total questions.
* Correct answers.
* Incorrect answers.
* Unanswered questions.
* Accuracy percentage.
* Score.
* Time taken.
* Topic-wise performance.
* Correct answers and explanations.
* Recommended topics to practice.

Formula:

Accuracy = Correct Answers / Attempted Questions × 100.

If no questions were attempted, display an appropriate empty value instead of dividing by zero.

## Round 2: Coding

Coding unlocks after the aptitude round is submitted and evaluated.

### Supported coding languages

The initial implementation should support at least:

* JavaScript
* Python
* Java

Additional languages may be added later.

### Coding question structure

Each question must include:

* Title.
* Problem statement.
* Input format.
* Output format.
* Constraints.
* Examples.
* Difficulty level.
* Topic.
* Starter code where appropriate.
* Hidden and visible test cases managed by the judging service.

### Coding editor

The coding page must include:

* Code editor with syntax highlighting.
* Language selector.
* Problem description.
* Example test cases.
* Run Code button.
* Submit Code button.
* Execution status.
* Test-case results.
* Time and memory information when provided by the judge.

A full code editor such as Monaco may be used if compatible with the selected React setup.

### Coding execution requirements

Code must run in a secure, isolated execution environment or trusted external judging service.

The application server must not directly execute arbitrary user-submitted code using unrestricted operating-system processes.

The judging system must enforce:

* Execution timeouts.
* Memory limits.
* Network restrictions.
* Process isolation.
* Output limits.
* Language-specific compilation or execution rules.

### Coding scoring

Calculate scores from actual judge results, including passed test cases and any configured partial-credit rules.

AI may explain code quality, complexity, and possible improvements, but AI-generated feedback must not override the judge's actual execution result.

### Coding feedback

Display:

* Test cases passed.
* Total test cases.
* Score.
* Correctness status.
* Runtime and memory usage when available.
* Time and space complexity analysis.
* Potential edge cases.
* Suggestions for improving the solution.
* Recommended related problems.

Do not reveal hidden test-case inputs or expected outputs to the user.

## Round 3: HR Interview

The HR round unlocks only after the coding round has been completed and evaluated.

This round must simulate an interview conversation using Gemini.

### HR interview requirements

* Conduct an interactive question-and-answer session.
* Ask one question at a time.
* Accept text answers initially.
* Provide a configurable number of questions, initially 8.
* Save each question and answer.
* Generate relevant follow-up questions when useful.
* Evaluate the answer after submission.
* Display feedback after the interview is completed, unless a practice mode explicitly enables immediate feedback.

### Question categories

* Introduction and background.
* Career goals.
* Strengths and weaknesses.
* Teamwork and collaboration.
* Conflict resolution.
* Leadership and responsibility.
* Problem-solving experiences.
* Motivation for applying to the selected company.
* Project discussions.
* Questions based on the user's resume.

### Mandatory resume-based questioning

The final HR round must use the resume uploaded and analyzed earlier.

For example, if the resume contains a project involving React, Node.js, MongoDB, and Gemini, the AI may ask:

* What problem does your project solve?
* Why did you choose the MERN stack?
* How does your backend communicate with Gemini?
* What challenges did you encounter?
* How did you validate the AI-generated responses?
* What would you improve in your next version?

The actual questions must be grounded in the candidate's resume and should vary according to its content.

If the resume does not contain enough information about a project or achievement, the AI should ask a clarification question instead of inventing details.

### HR answer evaluation

Evaluate each answer on a consistent 100-point rubric:

| Criterion                           | Weight |
| ----------------------------------- | -----: |
| Relevance to the question           |    30% |
| Clarity and structure               |    25% |
| Specificity and supporting examples |    20% |
| Professional communication          |    15% |
| Reflection and problem-solving      |    10% |

These criteria are an initial product rubric and should be configurable.

For each answer, return:

* Score.
* What the candidate did well.
* Areas for improvement.
* Missing points.
* A suggested stronger answer or answer structure.
* One practical improvement tip.

Do not require one exact wording. Accept different valid answers.

Do not penalize candidates based on accent, dialect, or irrelevant personal characteristics. Text-based communication feedback should focus on clarity, relevance, structure, and professionalism.

# 8. Question Generation Strategy

The platform must support two question sources.

## 8.1 Curated Historical Questions

Maintain a question bank containing questions that have reliable provenance.

Each question should record:

* Source type.
* Source reference or citation, when applicable.
* Company association.
* Role.
* Topic.
* Difficulty.
* Last verification date, where relevant.

Questions from community discussions or third-party sources must not be presented as verified official questions without evidence.

## 8.2 Gemini-Generated Questions

When suitable curated questions are unavailable, Gemini can generate original questions.

Generated questions must:

* Match the selected company preparation profile.
* Match the target role.
* Follow the configured topic distribution.
* Respect the difficulty level.
* Avoid duplicate questions within the same assessment.
* Include an answer key and explanation for aptitude questions.
* Include testable problem specifications for coding questions.
* Include expected evaluation criteria for HR questions.

For coding problems, Gemini-generated test cases must be validated before the question is published to an assessment. A reliable judge or test-generation and validation pipeline must establish that the problem statement, reference solution, and test cases are consistent.

Every question must be identified internally as curated or AI-generated.

# 9. Feedback and Progression Rules

The application must use server-side state to determine which rounds are available.

| User state                           | Available action                      |
| ------------------------------------ | ------------------------------------- |
| No resume analysis                   | Upload and analyze resume             |
| Resume analysis completed            | Select a company                      |
| Company selected                     | Start aptitude                        |
| Aptitude submitted and evaluated     | View feedback and unlock coding       |
| Coding submitted and evaluated       | View feedback and unlock HR           |
| HR interview completed and evaluated | View feedback and unlock final report |
| Final report generated               | View, download, or revisit results    |

A round is complete only when the backend has successfully saved its final evaluation.

### Retry behavior

* Users may retake completed rounds.
* A retake creates a new assessment attempt.
* Previous results must remain in history.
* The user must be able to identify the latest attempt and previous attempts.
* Retaking a round must not delete the original result.
* The application must define whether the latest score or best score is used in the overall report. Initial default: use the latest completed attempt and display the best score separately.

# 10. Final Placement-Readiness Report

After all required rounds are complete, generate a final report.

The report must include:

## A. Candidate Overview

* Candidate name.
* Target company.
* Target role.
* Resume analyzed.
* Report creation date.

## B. Resume Evaluation

* Overall resume score.
* Formatting feedback.
* Content feedback.
* Highest-priority improvements.

## C. Aptitude Results

* Score.
* Accuracy.
* Time taken.
* Strongest topics.
* Weakest topics.

## D. Coding Results

* Score.
* Test cases passed.
* Problem-solving strengths.
* Topics requiring improvement.
* Code quality observations.

## E. HR Interview Results

* Overall HR score.
* Individual answer scores.
* Communication strengths.
* Missing or weak responses.
* Resume-based question performance.

## F. Overall Assessment

Provide a weighted placement-preparation score.

Initial default weights:

| Component | Weight |
| --------- | -----: |
| Resume    |    20% |
| Aptitude  |    25% |
| Coding    |    35% |
| HR        |    20% |

Calculate:

Overall Score = Resume Score × 0.20 + Aptitude Score × 0.25 + Coding Score × 0.35 + HR Score × 0.20.

All component scores must be normalized to a 0–100 scale.

The report must not be generated as a completed report while any required round is incomplete. Show an in-progress report preview instead, if useful.

### Important interpretation

The overall score is an internal preparation metric. It is not a real company's selection score, an ATS guarantee, or a reliable probability of receiving an offer.

## G. Personalized Improvement Plan

Generate:

* Top three weaknesses.
* Recommended learning topics.
* Suggested practice exercises.
* Resume improvements.
* Interview practice recommendations.
* A practical next-step plan.

The recommendations must be based on actual assessment results.

## H. Downloadable Report

Provide a downloadable PDF report containing the candidate's completed results, feedback, and improvement plan.

The downloaded report must be generated from validated, persisted results, not from unsaved browser state.

# 11. UI/UX Requirements

## 11.1 Design Direction

Create a modern, professional AI-powered career platform.

Visual direction:

* Clean dashboard layout.
* Professional typography.
* Consistent spacing.
* Clear hierarchy of headings.
* Accessible color contrast.
* Restrained use of gradients and decorative effects.
* Cards for assessments, company profiles, and progress.
* Progress bars and score visualizations.
* Clear success, warning, error, and locked states.
* Responsive layout for desktop, tablet, and mobile.

The website must feel like a credible career-preparation product rather than a generic chatbot.

## 11.2 Landing Page

Sections:

1. Navigation bar.
2. Hero section with a clear value proposition.
3. Start Preparation CTA.
4. How It Works.
5. Resume Analysis features.
6. Company Preparation features.
7. Aptitude, coding, and HR workflow.
8. Benefits and progress tracking.
9. FAQ.
10. Footer.

## 11.3 Dashboard

Use cards for:

* Resume status.
* Preparation progress.
* Current target company.
* Next available round.
* Latest results.
* Recommended actions.

## 11.4 Resume Analysis Page

Include:

* Drag-and-drop upload area.
* File selection.
* File validation.
* Upload progress.
* Analysis progress.
* Resume score.
* Section feedback.
* Formatting recommendations.
* Improvement checklist.
* Continue to Company Selection button.

## 11.5 Company Selection Page

Display five company cards initially.

Each card must show the company name, supported preparation track, round sequence, and current progress.

Provide filters or role selection if useful.

## 11.6 Assessment Pages

Aptitude:

* Question panel.
* Answer options.
* Timer.
* Question navigation.
* Answer status.
* Submit button.

Coding:

* Problem description.
* Code editor.
* Language selector.
* Run and submit controls.
* Test-case results.
* Execution state.

HR:

* Interview question.
* Answer text area.
* Submit answer button.
* Interview progress.
* Next question control.

## 11.7 Results Pages

Display:

* Score summary.
* Performance breakdown.
* Correct and incorrect answers where applicable.
* Detailed AI feedback.
* Recommendations.
* Continue to next round.
* Retake option when allowed.

## 11.8 Accessibility

* All important controls must be keyboard accessible.
* Forms must have labels.
* Validation errors must be understandable.
* Do not rely on color alone to communicate status.
* Support appropriate loading, empty, error, and disabled states.
* Use semantic HTML and accessible interactive controls.

# 12. Backend Architecture

Use a modular Express application.

Suggested structure:

server/

* src/

  * app.js
  * server.js
  * config/

    * db.js
    * env.js
  * models/

    * User.js
    * Resume.js
    * Company.js
    * Assessment.js
    * Attempt.js
    * InterviewSession.js
    * Report.js
  * routes/

    * auth.routes.js
    * user.routes.js
    * resume.routes.js
    * company.routes.js
    * assessment.routes.js
    * interview.routes.js
    * report.routes.js
  * controllers/
  * services/

    * gemini.service.js
    * resumeParser.service.js
    * resumeAnalysis.service.js
    * questionGeneration.service.js
    * assessmentEvaluation.service.js
    * codeJudge.service.js
    * interviewEvaluation.service.js
    * reportGeneration.service.js
  * middleware/

    * auth.middleware.js
    * error.middleware.js
    * upload.middleware.js
    * rateLimit.middleware.js
  * validators/
  * utils/
  * tests/

The exact directory names may be adapted to existing repository conventions. Keep route handling, business logic, database access, and AI integration separated.

# 13. Frontend Architecture

Suggested structure:

client/

* src/

  * main.jsx
  * App.jsx
  * routes/
  * components/

    * common/
    * layout/
    * dashboard/
    * resume/
    * company/
    * aptitude/
    * coding/
    * interview/
    * results/
  * pages/

    * LandingPage.jsx
    * RegisterPage.jsx
    * LoginPage.jsx
    * DashboardPage.jsx
    * ResumeAnalysisPage.jsx
    * CompanySelectionPage.jsx
    * CompanyPreparationPage.jsx
    * AptitudeAssessmentPage.jsx
    * CodingAssessmentPage.jsx
    * HRInterviewPage.jsx
    * ResultsPage.jsx
    * HistoryPage.jsx
    * ProfilePage.jsx
    * NotFoundPage.jsx
  * services/

    * api.js
    * auth.service.js
    * resume.service.js
    * assessment.service.js
    * interview.service.js
    * report.service.js
  * hooks/
  * context/
  * utils/
  * styles/

Reuse components where possible. Do not duplicate entire pages for each company. Company-specific behavior must be driven by configuration and shared assessment components.

# 14. MongoDB Data Models

The following are conceptual schemas. Codex must define actual Mongoose schemas, validation rules, indexes, references, timestamps, and ownership checks.

## 14.1 User

Fields:

* name
* email
* passwordHash
* targetRole
* preferredCompanies
* createdAt
* updatedAt

Requirements:

* Unique normalized email.
* Never store plaintext passwords.
* Exclude password hashes from API responses.

## 14.2 Resume

Fields:

* userId
* originalFileName
* storageKey or file reference
* mimeType
* fileSize
* extractedText
* targetRole
* analysisStatus
* analysisResult
* createdAt
* updatedAt

Requirements:

* Associate every resume with its owner.
* Store validated analysis output.
* Limit access to the owning user.
* Apply retention and deletion policies to the file and extracted text.

## 14.3 Company

Fields:

* companyId
* name
* description
* supportedRoles
* preparationConfiguration
* active
* createdAt
* updatedAt

The five initial company profiles should be seed data or managed configuration, not duplicated as hardcoded logic throughout the frontend.

## 14.4 Assessment

Fields:

* companyId
* targetRole
* roundType
* title
* difficulty
* questionSource
* questions
* durationSeconds
* scoringConfiguration
* version
* createdAt

Round types:

* aptitude
* coding

Assessment questions must not expose hidden answer keys or hidden judge data to the frontend.

## 14.5 Attempt

Fields:

* userId
* assessmentId
* attemptNumber
* status
* startedAt
* submittedAt
* answers or submission references
* score
* evaluation
* durationSeconds
* createdAt
* updatedAt

The stored evaluation must be tied to the correct attempt and assessment version.

## 14.6 InterviewSession

Fields:

* userId
* companyId
* resumeId
* status
* currentQuestionIndex
* questions
* answers
* evaluations
* overallScore
* startedAt
* completedAt
* createdAt

Store the resume reference used for the interview so that the evaluation can be traced to the correct resume version.

## 14.7 Report

Fields:

* userId
* companyId
* resumeId
* assessmentAttemptIds
* interviewSessionId
* componentScores
* overallScore
* recommendations
* reportVersion
* createdAt

Reports should be generated only from valid completed results.

# 15. REST API Specification

All endpoints must use a consistent JSON response format and appropriate HTTP status codes.

Base prefix:

`/api/v1`

## Authentication

* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/logout`
* `GET /api/v1/auth/me`

## Dashboard and User

* `GET /api/v1/dashboard`
* `GET /api/v1/users/me`
* `PATCH /api/v1/users/me`
* `GET /api/v1/history`

## Resume

* `POST /api/v1/resumes`
* `GET /api/v1/resumes`
* `GET /api/v1/resumes/:resumeId`
* `POST /api/v1/resumes/:resumeId/analyze`
* `GET /api/v1/resumes/:resumeId/analysis`
* `DELETE /api/v1/resumes/:resumeId`

## Companies

* `GET /api/v1/companies`
* `GET /api/v1/companies/:companyId`
* `GET /api/v1/companies/:companyId/progress`

## Assessments

* `POST /api/v1/companies/:companyId/assessments/generate`
* `GET /api/v1/assessments/:assessmentId`
* `POST /api/v1/assessments/:assessmentId/start`
* `PATCH /api/v1/attempts/:attemptId/answers`
* `POST /api/v1/attempts/:attemptId/submit`
* `GET /api/v1/attempts/:attemptId/result`
* `POST /api/v1/assessments/:assessmentId/retake`

## Coding

* `POST /api/v1/attempts/:attemptId/run-code`
* `POST /api/v1/attempts/:attemptId/submit-code`

The backend must obtain authoritative test results from the configured code judge.

## HR Interviews

* `POST /api/v1/companies/:companyId/interviews`
* `GET /api/v1/interviews/:sessionId`
* `POST /api/v1/interviews/:sessionId/answer`
* `POST /api/v1/interviews/:sessionId/complete`
* `GET /api/v1/interviews/:sessionId/result`

## Reports

* `POST /api/v1/reports/generate`
* `GET /api/v1/reports`
* `GET /api/v1/reports/:reportId`
* `GET /api/v1/reports/:reportId/pdf`

### API rules

1. Require authentication on all protected endpoints.
2. Verify ownership of every requested resource.
3. Validate request bodies, query parameters, and identifiers.
4. Reject invalid state transitions.
5. Use server-side scoring.
6. Never accept a client-provided score as authoritative.
7. Prevent duplicate submissions through idempotency or equivalent safeguards.
8. Use pagination for growing history lists.
9. Apply rate limits to authentication, uploads, Gemini calls, and code execution.
10. Return meaningful errors without exposing stack traces, secrets, or internal implementation details.

# 16. Gemini AI Integration

Create a dedicated Gemini service on the backend.

All AI functionality must use this service rather than making direct Gemini calls from individual controllers.

### Responsibilities

* Resume analysis.
* Aptitude question generation.
* Coding problem generation.
* HR question generation.
* Resume-based interview follow-ups.
* Answer evaluation.
* Explanation generation.
* Personalized recommendations.

### AI response rules

1. Use structured output or JSON responses where supported by the selected Gemini model.
2. Validate every AI response on the backend.
3. Handle invalid JSON and missing fields.
4. Reject scores outside the defined range.
5. Apply timeouts and retry only suitable transient failures.
6. Respect rate limits and configured usage budgets.
7. Do not blindly retry invalid requests or permanent failures.
8. Keep prompts versioned and testable.
9. Never expose API keys or internal prompts unnecessarily.
10. Do not allow resume text or user answers to override system instructions.
11. Treat uploaded content as untrusted data.
12. Provide a useful error state if Gemini is unavailable.
13. Persist successful evaluations so that page refreshes do not require unnecessary AI calls.

### Environment variables

The backend should use environment variables such as:

* `PORT`
* `MONGODB_URI`
* `GEMINI_API_KEY`
* `GEMINI_MODEL`
* `JWT_SECRET`
* `CLIENT_URL`
* `RESUME_STORAGE_PROVIDER`
* `CODE_JUDGE_URL`
* `CODE_JUDGE_API_KEY`

Additional variables may be introduced where required.

The application must fail safely when required environment variables are missing and clearly identify configuration errors in server logs without printing secret values.

Do not assume that a particular Gemini model name will remain available forever. Select a currently supported model, configure it through `GEMINI_MODEL`, and document the selected model in deployment configuration.

# 17. Security and Privacy

The application handles resumes, personal details, and assessment records. Security is a core requirement.

Required controls:

* Password hashing.
* Secure authentication and authorization.
* Resource ownership checks.
* Input validation.
* File upload validation.
* File storage access controls.
* Rate limiting.
* Secure CORS configuration.
* HTTPS in production.
* Protection against NoSQL injection.
* Appropriate HTTP security headers.
* Secure token and session handling.
* Secret management through environment variables.
* Safe error messages.
* Restricted code execution.
* Protection against prompt injection.
* No unnecessary logging of personal information.
* User-initiated resume and account data deletion.
* Clear retention policies for resumes, extracted text, and reports.

Use secure, HTTP-only cookies with suitable `SameSite` and `Secure` settings if cookie-based authentication is selected. If JWT-based authorization headers are used instead, document the token lifecycle and storage strategy; do not store sensitive tokens in insecure locations without assessing the risk.

# 18. Error Handling

The frontend must support these states:

* Loading.
* Empty data.
* Validation error.
* Authentication failure.
* Network failure.
* Gemini unavailable.
* Invalid AI output.
* Resume parsing failure.
* Upload failure.
* Assessment submission failure.
* Time expiration.
* Code execution timeout.
* Code judge unavailable.
* Unauthorized access.
* Not found.
* Unexpected server error.

The user must receive a helpful message and a reasonable recovery action.

Example:

If Gemini fails during resume analysis, show:

"Resume analysis could not be completed. Your uploaded resume is still available. Please try again."

Do not mark the analysis as completed if the backend failed to save a valid result.

# 19. Non-Functional Requirements

## Performance

* Keep page navigation responsive.
* Use loading indicators for long-running AI operations.
* Avoid repeated Gemini requests for already completed analysis.
* Paginate large histories.
* Use database indexes for frequently queried fields.
* Move long-running operations to background jobs if synchronous processing becomes unreliable.

## Reliability

* Persist important state changes.
* Prevent duplicate submissions.
* Preserve assessment history.
* Handle service outages gracefully.
* Make assessment state recoverable after a page refresh.

## Scalability

* Separate AI generation from evaluation and persistence.
* Use configurable question-generation and assessment services.
* Keep company-specific rules data-driven.
* Allow additional companies, roles, languages, and question categories without rebuilding the entire application.

## Maintainability

* Keep controllers small.
* Separate business logic from HTTP handling.
* Reuse UI components.
* Validate API inputs.
* Maintain consistent naming.
* Document important architectural decisions.
* Write automated tests for core workflows.

# 20. Testing Requirements

## Authentication Tests

* Successful registration.
* Duplicate email rejection.
* Successful login.
* Incorrect password rejection.
* Protected route behavior.
* Cross-user data access rejection.

## Resume Tests

* Valid PDF upload.
* Valid DOCX upload.
* Unsupported file rejection.
* Oversized file rejection.
* Corrupted file handling.
* Text extraction.
* Gemini analysis validation.
* Resume ownership.
* Failed analysis recovery.

## Aptitude Tests

* Correct scoring.
* Incorrect answer scoring.
* Unanswered questions.
* Timer expiration.
* Submission validation.
* Duplicate submission protection.
* Feedback persistence.

## Coding Tests

* Correct code.
* Incorrect code.
* Compilation error.
* Runtime error.
* Timeout.
* Hidden test-case handling.
* Judge outage.
* Actual server-side score calculation.

## HR Tests

* Questions generated from the correct resume.
* Missing resume information handled safely.
* Answers saved correctly.
* Evaluation schema validated.
* Interview completion rules enforced.
* Cross-user session access rejected.

## Report Tests

* Correct weighted calculation.
* Incomplete rounds rejected.
* Report generated from persisted scores.
* PDF download.
* Report ownership and privacy.

## End-to-End Test

A test user must be able to:

1. Register.
2. Log in.
3. Upload a resume.
4. Receive resume analysis.
5. Select a company.
6. Complete aptitude.
7. View aptitude feedback.
8. Complete coding.
9. View coding feedback.
10. Complete a resume-based HR interview.
11. View HR feedback.
12. Generate the final report.
13. Download the PDF.
14. Refresh or revisit the application without losing saved progress.

# 21. Definition of Done

A feature is complete only when:

* Its UI is implemented.
* Its backend endpoint is implemented where needed.
* Data validation is implemented.
* Database persistence works.
* Authentication and authorization are enforced.
* Loading, success, and failure states are implemented.
* AI output is validated where applicable.
* Relevant automated tests pass.
* The feature works in the deployed environment when deployment is in scope.
* No critical console or server errors remain.
* The feature is documented if it introduces an important architectural decision.

A visually completed page with nonfunctional buttons does not satisfy the Definition of Done.

# 22. Development Phases

Codex must implement the application incrementally rather than attempting to generate the entire product in one unverified operation.

## Phase 1: Project Foundation

* Inspect the existing repository.
* Confirm the frontend and backend structure.
* Configure React and Express.
* Configure MongoDB.
* Add environment validation.
* Add routing and global error handling.
* Establish the API response format.
* Create the initial responsive layout.

**Exit criteria:** Frontend and backend start successfully, and the database connection is verified.

## Phase 2: Authentication and Dashboard

* Registration.
* Login.
* Logout.
* Protected routes.
* User profile.
* Dashboard.
* Persistent progress structure.

**Exit criteria:** Authenticated users can access their own dashboard securely.

## Phase 3: Resume Analysis

* Upload PDF/DOCX.
* Extract text.
* Integrate Gemini.
* Validate analysis output.
* Display score and detailed feedback.
* Save analysis.
* Handle failures.

**Exit criteria:** A valid resume can be analyzed and the saved result survives a page refresh.

## Phase 4: Company Selection

* Seed five company profiles.
* Display company cards.
* Support target-role selection.
* Add preparation overview.
* Implement progression state.

**Exit criteria:** The user can select a company and start the correct preparation path.

## Phase 5: Aptitude Assessment

* Question bank.
* Gemini question generation.
* Assessment timer.
* Answer persistence.
* Submission.
* Scoring.
* Detailed feedback.

**Exit criteria:** Aptitude results are saved and coding is unlocked only after valid completion.

## Phase 6: Coding Assessment

* Coding editor.
* Problem generation and validation.
* Code judge integration.
* Run and submit.
* Test-case results.
* Scoring and feedback.

**Exit criteria:** Code is actually executed by a secure judging system and results are persisted correctly.

## Phase 7: HR Interview

* Interactive question flow.
* Resume-based questions.
* Answer persistence.
* AI evaluation.
* Follow-up questions.
* Completion state.

**Exit criteria:** The completed interview contains relevant resume-based questions and validated feedback.

## Phase 8: Final Report

* Aggregate component results.
* Calculate overall score.
* Generate recommendations.
* Create PDF.
* Save report history.

**Exit criteria:** The user can view and download a report based on all completed rounds.

## Phase 9: Quality and Deployment

* Automated tests.
* Responsive testing.
* Security review.
* Error handling.
* Production environment configuration.
* Deployment verification.
* End-to-end testing.

**Exit criteria:** The complete core workflow operates successfully in the target deployment environment.

# 23. Spec-Driven Development Rules for Codex

This section defines how Codex must use this document.

## Rule 1: Treat This Specification as the Source of Truth

Use this document as the authoritative definition of product behavior, features, workflows, and acceptance criteria.

Do not invent conflicting behavior or remove requirements without an explicit decision.

## Rule 2: Inspect Before Editing

Before changing code:

* Inspect the repository.
* Read existing package configuration.
* Identify implemented features.
* Identify the actual API routes and database models.
* Identify existing reusable components.
* Check which environment variables are required.
* Determine whether the project already contains partial implementations.

Do not replace working project files blindly.

## Rule 3: Plan Before Implementing

For each phase:

1. Identify requirements from this specification.
2. Identify dependencies.
3. List files to create or modify.
4. Explain the implementation approach.
5. Identify validation and testing requirements.
6. Implement only the planned scope.
7. Run tests or relevant verification.
8. Report completed work and remaining issues.

## Rule 4: Explain Important Changes

For each significant code change, explain:

* What is changing.
* Why the change is required.
* How it supports this specification.
* Which files are affected.
* How to verify it works.

Keep explanations beginner-friendly.

## Rule 5: Do Not Fake Functionality

Never substitute:

* Hardcoded scores for real evaluation.
* Static AI feedback for Gemini integration.
* Fake progress for persisted assessment state.
* Simulated code execution for a real judge.
* Dummy login for real authentication.
* Placeholder report downloads for actual PDF generation.

Temporary mocks are permitted only during explicitly identified development or testing stages and must not be represented as completed production functionality.

## Rule 6: Maintain a Requirements Checklist

Track each requirement as:

* Not Started.
* In Progress.
* Implemented.
* Tested.
* Verified.

A feature must not be marked Tested or Verified simply because the code was written.

## Rule 7: Keep Documentation Synchronized

Maintain these supporting files:

* `SPEC.md` — the master specification.
* `IMPLEMENTATION_PLAN.md` — phases, dependencies, and milestones.
* `TASKS.md` — actionable implementation checklist.
* `DECISIONS.md` — significant architectural decisions and their rationale.
* `README.md` — setup, environment variables, development, testing, and deployment.

If implementation requires a change to product behavior, document the discrepancy and proposed decision before changing the specification.

## Rule 8: Verify Each Phase Before Proceeding

Do not implement the entire system before checking whether the foundation works.

Finish one phase, test it, and confirm its exit criteria before moving to the next phase, unless a dependency explicitly requires parallel work.

## Rule 9: Secure Secrets and User Data

Never commit API keys, database credentials, JWT secrets, uploaded resumes, or other private user data.

Use environment variables and example configuration files containing placeholders only.

## Rule 10: Report Honest Completion Status

After each phase, provide:

* Requirements completed.
* Files created or modified.
* Tests executed and their actual results.
* Environment variables or services still required.
* Known limitations.
* Exact next step.

Do not claim that a feature is working unless it has been verified to the extent reported.

# 24. Initial Acceptance Criteria

The first complete product release must satisfy all the following:

* [ ] Users can register and log in.
* [ ] Authentication and data ownership are enforced.
* [ ] Users can upload valid PDF and DOCX resumes.
* [ ] Resume text is extracted successfully.
* [ ] Gemini generates validated resume analysis.
* [ ] Formatting and content recommendations are displayed honestly.
* [ ] Users can select from five initial company profiles.
* [ ] Each company has a configurable preparation track.
* [ ] Aptitude questions can be generated or retrieved.
* [ ] Aptitude submissions are evaluated and saved.
* [ ] Coding assessments execute code through a secure judge.
* [ ] Coding scores use actual execution results.
* [ ] HR questions are grounded in the user's resume.
* [ ] HR answers receive structured feedback.
* [ ] Round progression follows the specified rules.
* [ ] Users can view their saved progress and history.
* [ ] The final score follows the defined weighting formula.
* [ ] The final report contains all completed-round results.
* [ ] The final report can be downloaded as a PDF.
* [ ] The application works on mobile and desktop.
* [ ] Important error cases have usable recovery paths.
* [ ] Automated tests cover critical workflows.
* [ ] No secrets are exposed in client-side code.
* [ ] The complete workflow passes an end-to-end test.

# 25. Final Product Definition

AI Career Coach is complete when a user can go from an uploaded resume to a personalized, saved, downloadable placement-preparation report through a functioning MERN web application powered by Gemini.

The product must combine resume analysis, company-specific preparation, aptitude testing, secure coding evaluation, resume-based HR interviews, progress tracking, and actionable feedback into one consistent workflow.

**Primary success criterion:** A first-time user can complete the entire supported workflow without manually changing database records, bypassing application logic, or relying on hardcoded assessment results.

**Implementation priority:** Correct functionality and secure data handling first, reliable AI integration second, user experience and polish throughout, and production hardening before release.
# 26. Additional Features

The following features extend the existing AI Career Coach application. They must integrate with the existing MERN architecture, Gemini AI service, authentication system, database models, and user dashboard.

All existing requirements and workflows must remain intact.

## 26.1 Personalized Study Plan

Create a personalized placement preparation plan for each user.

Requirements:

* Analyze the user's resume and completed assessment results.
* Identify weak aptitude topics, coding concepts, and HR interview skills.
* Allow users to select a target company, target role, and optional placement date.
* Use Gemini to generate a personalized preparation plan.
* Organize the plan into daily tasks.
* Include recommended topics, practice questions, coding exercises, and interview practice.
* Allow users to mark tasks as completed.
* Track daily and overall completion percentages.
* Update future recommendations based on newly completed assessments.
* Save study plans and task progress in MongoDB.

If assessment results are unavailable, generate an initial plan based on the user's target role and stated goals.

## 26.2 Advanced Performance Dashboard

Extend the existing dashboard with detailed performance analytics.

Display:

* Resume analysis score.
* Aptitude assessment scores.
* Coding assessment scores.
* HR interview scores.
* Overall placement preparation score.
* Completed and pending rounds.
* Strongest and weakest topics.
* Recent assessment history.
* Improvement compared with previous attempts.
* Personalized recommendations.

Requirements:

* Use persisted backend data.
* Display charts showing score changes over time.
* Support empty states for new users.
* Distinguish between actual assessment results and AI-generated recommendations.
* Refresh analytics when a new assessment is completed.

## 26.3 AI Resume Builder

Allow users to create and improve professional resumes.

Requirements:

* Provide a form for entering education, technical skills, projects, experience, certifications, and achievements.
* Allow users to import information from an existing uploaded resume.
* Use Gemini to improve wording, clarity, and professional presentation.
* Generate achievement-focused bullet points without inventing qualifications or accomplishments.
* Provide professional, ATS-friendly templates.
* Support resume preview and editing before export.
* Allow users to download the completed resume as a PDF.
* Save resume drafts in MongoDB.
* Allow users to compare the original resume with AI suggestions.
* Let users choose a target role to personalize resume recommendations.

The user must review and approve AI-generated changes before they become part of the final resume.

## 26.4 Voice-Based HR Interviews

Extend the existing text-based HR interview with optional voice interaction.

Requirements:

* Request microphone permission before recording.
* Allow users to record answers to interview questions.
* Convert spoken answers into text using a suitable speech-to-text service.
* Display the transcribed answer so the user can review it.
* Allow the user to edit the transcription before submission.
* Evaluate the submitted answer using the existing HR evaluation rubric.
* Save the question, transcription, evaluation, and interview progress.
* Provide clear microphone, recording, processing, and submission states.
* Handle denied microphone permissions and speech recognition failures gracefully.
* Keep text-based interviews available as an alternative.
* Do not record or store audio without the user's explicit consent.

Voice-based interaction must reuse the existing interview session and scoring system rather than create a separate, inconsistent evaluation system.

## 26.5 Progress Comparison

Allow users to compare their current performance with previous attempts.

Requirements:

* Store each completed assessment attempt separately.
* Display previous and current scores.
* Show changes in aptitude accuracy, coding correctness, and HR evaluation.
* Identify topics that have improved or declined.
* Compare resume scores across different resume versions.
* Display performance trends over time.
* Generate personalized recommendations based on actual score changes.
* Never delete historical results when a user retakes an assessment.

Clearly distinguish score improvement from guaranteed improvement in real-world placement outcomes.

## 26.6 Integration Requirements

All additional features must:

* Use the existing authentication and authorization system.
* Save relevant user data in MongoDB.
* Follow the existing backend API conventions.
* Reuse existing React components and services where appropriate.
* Use Gemini through the backend only.
* Validate AI responses before saving them.
* Include loading, empty, success, and error states.
* Work with the existing dashboard and placement preparation workflow.
* Be responsive on desktop, tablet, and mobile.
* Include appropriate automated tests.

Do not implement these features as disconnected demo pages or static mockups.

## 26.7 Additional Acceptance Criteria

* [ ] Users can generate and update personalized study plans.
* [ ] Users can track daily study tasks.
* [ ] Dashboard analytics reflect persisted assessment results.
* [ ] Users can create, edit, preview, and export resumes.
* [ ] Voice interviews support recording and transcription when the required service is configured.
* [ ] Text-based interviews continue to work.
* [ ] Users can compare previous assessment attempts.
* [ ] Historical results remain available after retakes.
* [ ] Existing core functionality continues to work.
* [ ] New features are tested and integrated with the existing application.
