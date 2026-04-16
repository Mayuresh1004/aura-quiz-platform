# Aura Quiz Platform: Architecture and Feature Documentation

The Aura Quiz Platform is a state-of-the-art, highly scalable full-stack web application designed to deliver secure, cloud-based assessments. It integrates modern web technologies with advanced serverless architectures and artificial intelligence to provide dynamic learning experiences for students and deep, actionable analytics for educators.

## 1. Teacher Dashboard (`/teacher/dashboard`)

The Teacher Dashboard serves as a comprehensive command center for instructors, enabling them to monitor student performance, manage assessments, and derive insights from class-wide data.

### 1.1 Quick Stats
At the top of the dashboard, teachers are presented with three high-level, aggregate metrics designed for immediate visibility into overall course health:
*   **Total Students:** The aggregate number of unique students who have attempted at least one of the teacher's quizzes. This helps track class participation and platform adoption.
*   **Active Quizzes:** The total count of active assessments currently deployed by the teacher.
*   **Avg Pass Rate:** The percentage of all quiz attempts that culminated in a score of 60% or higher, offering a macroscopic view of student comprehension.

### 1.2 Quiz Management System
Below the analytics visualizations lies a robust, searchable, and filterable list of all quizzes authored by the teacher.
*   **Comprehensive Metadata:** Each list entry clearly displays the quiz Title, Subject, Time Limit, and the total Number of Questions.
*   **Deadline Awareness:** Due dates are prominently displayed and intelligently highlighted in amber when deadlines are approaching, ensuring teachers can track active testing windows.
*   **Attempt Tracking:** Displays the aggregate number of historical attempts submitted by students for each specific quiz.
*   **Drill-Down Capability:** Each quiz features a direct link to a "View Results" page. This isolated view provides per-quiz analytics, allowing educators to investigate granular data, such as failure rates on individual questions, to identify specific knowledge gaps.

### 1.3 The Teacher Lifecycle
1.  **Authentication & Entry:** A teacher logs into the platform securely via AWS Cognito and lands on their highly visual dashboard.
2.  **Analytics Review:** They review anomalies in the visualized data (e.g., noticing an unusually low average score on "Unit 3 Quiz").
3.  **Targeted Investigation:** The teacher clicks "View Results" for the problematic quiz to see exactly which questions the students failed.
4.  **Assessment Creation:** The instructor clicks "Create Quiz", defines metadata (time limits, deadlines), inputs questions, assigns initial difficulty ratings, and saves the quiz to DynamoDB.

---

## 2. Student Dashboard (`/student/dashboard`)

The Student Dashboard prioritizes clarity, separating actionable tasks from historical review using a clean, intuitive tabbed interface.

### 2.1 "Available Quizzes" Tab
This active workspace displays all pending assessments assigned to the student.
*   **Actionable Interface:** Shows essential quiz metadata (Time Limit, Question Count, Subject, Due Date) alongside a prominent "Start Attempt" button.
*   **Deadline Enforcement:** If a student misses a deadline, the due date text dynamically turns red, visually indicating a late or expired status.

### 2.2 "Completed" Tab
This historical archive lists all quizzes the student has previously taken, serving as a personalized performance ledger.
*   **Best Score Tracking:** Specifically highlights the student's highest achieved score out of all chronological attempts for a given quiz, encouraging mastery through repetition.
*   **Attempt History Dropdown:** Students can expand individual quizzes to access a chronological timeline of every past attempt for that specific assessment.

### 2.3 AI Feedback Viewer
Nestled within the attempt history is a powerful, AI-driven learning tool.
*   **Expandable Insights:** By clicking "AI Feedback" on a specific historical attempt, an expandable section toggles open.
*   **Personalized Coaching:** This section displays dynamically generated, personalized insights powered by Gemini AI, offering specific guidance based on the exact choices the student made during that exact attempt.

### 2.4 The Student Lifecycle
1.  **Discovery:** A student logs in and discovers a new assignment pending in their "Available Quizzes" tab.
2.  **Execution:** They click "Start Attempt", initiating a timed testing environment.
3.  **Submission & Real-Time Processing:** Upon selecting their final answers and clicking submit:
    *   A Next.js Server Action records the attempt in DynamoDB.
    *   The `gemini-feedback-service` is invoked asynchronously to generate localized, empathetic feedback.
    *   Amazon SageMaker evaluates the attempt globally to dynamically adjust the underlying question's difficulty rating.
4.  **Review:** The student immediately receives their score. They can then navigate to the "Completed" tab, expand their attempt history, and read the newly generated AI feedback snippet to understand exactly what concepts they missed and how to improve.

---

## 3. Analytics and Data Visualization

The platform leverages advanced charting libraries (`react-chartjs-2` and `chartjs-plugin-annotation`) to transform raw database records into visual insights, empowering teachers to make data-driven instructional decisions.

*   **Score Distribution Chart:** A comprehensive chart aggregating all student attempts across all quizzes. It visualizes clusters of scores (e.g., the volume of students scoring within the 90-100% or 80-89% brackets), providing a clear picture of the class's standard deviation and overall mastery level.
*   **Difficulty Trend Line:** A visual representation (such as a stacked area chart) tracking the distribution of automated difficulty tags (`EASY`, `MEDIUM`, `HARD`) across the chronological sequence of quizzes an instructor has created. This helps teachers ensure their curriculum is progressively challenging the students appropriately.
*   **Average Score Per Quiz Chart:** A distinct bar or line chart illustrating the mean score of the entire classroom for each individual quiz. This immediately highlights specific topics or units where the class struggled as a whole.
*   **Per-Question Failure Rates (Drill-Down Analytics):** Accessed via the isolated quiz results page, this highly specific metric calculates the exact percentage of students who failed an individual question. This enables highly targeted lesson reviews, allowing teachers to address specific misconceptions.

---

## 4. Core Technologies and Cloud Ecosystem

The Aura Quiz Platform is architected upon a modern, highly scalable full-stack foundation, deeply integrated with enterprise-grade AWS services.

### 4.1 Frontend and Framework
*   **Framework:** Next.js 16.1.7, heavily utilizing the App Router architecture and React Server Actions for secure, server-side logic execution and seamless data mutating.
*   **User Interface:** React 19 forms the component base, styled with Tailwind CSS v4 for rapid, utility-first UI development.
*   **Animations:** Framer Motion provides dynamic, glassmorphic micro-animations and smooth page transitions, ensuring a premium user experience.
*   **Iconography:** Lucide React supplies a clean, consistent SVG icon set.
*   **Data Visualization:** Chart.js, paired with `chartjs-plugin-annotation`, handles the complex rendering of the teacher analytics dashboards.

### 4.2 Cloud Backend Architecture
The backend relies entirely on the `@aws-sdk` ecosystem, utilizing serverless managed services for maximum scalability and zero operational overhead.
*   **AWS Cognito:** Acts as the central Identity Provider (IdP). It manages user registration, secure login workflows, JWT access token issuance, and strict Role-Based Access Control (RBAC) separating Admin, Teacher, and Student privileges.
*   **Amazon DynamoDB:** A fully managed, serverless NoSQL database. It is utilized for ultra-low latency data persistence, employing a highly optimized Single-Table Design to handle the platform's relational data access patterns rapidly.
*   **Amazon SageMaker:** AWS's premier machine learning service, utilized to host and execute real-time ML inference for the platform's dynamic difficulty adjustment loop.

---

## 5. Artificial Intelligence Integration

The platform distinguishes itself by leveraging two distinct AI/ML architectures to drive adaptive learning and personalized feedback.

### 5.1 Dynamic Difficulty Estimation Loop (Amazon SageMaker)
This automated system ensures the platform's content constantly calibrates to the actual abilities of the student body.
*   **Data Capture:** When a student submits a quiz, the exact responses are securely captured.
*   **Metric Calculation:** The system calculates a historical "Success Rate" for each individual question across all student attempts.
*   **ML Inference:** This statistical data is passed securely to a specialized AI model hosted on Amazon SageMaker via the `estimateQuestionDifficulty` function.
*   **Dynamic Calibration:** The SageMaker model evaluates the historical performance data against the question's current properties and returns a re-evaluated difficulty tag (`EASY`, `MEDIUM`, or `HARD`).
*   **Database Sync:** These dynamically adjusted tags are instantly written back to the Quiz record in DynamoDB, guaranteeing that the platform's understanding of question difficulty naturally evolves based on authentic student performance.

### 5.2 Personalized Attempt Feedback (Gemini AI)
This feature provides students with immediate, empathetic tutoring specific to their mistakes.
*   **Trigger Event:** A submitted quiz attempt automatically triggers the internal `gemini-feedback-service` during the Server Action flow.
*   **Contextual Prompting:** The service passes the specific quiz context, the exact textual choices the student made, and the correct answers to the Gemini AI API.
*   **Generation & Storage:** The AI generates a tailored, empathetic string of textual feedback, explaining the rationale behind the correct answers and suggesting specific areas for future study. This generated string is cached directly onto the `aiFeedback` field of that specific Attempt record in the database for instant retrieval.

---

## 6. Database Schema and Access Patterns

Aura Quiz Platform utilizes a heavily optimized **Single-Table Design** in Amazon DynamoDB. This architecture allows the platform to serve complex, highly relational data views while rigorously minimizing Read Capacity Units (RCUs) and latency.

### 6.1 User Record
Stores authentication metadata and role definitions.
*   **Partition Key (PK):** `USER#<id>`
*   **Sort Key (SK):** `METADATA`
*   **Attributes:** `email`, `role` (`ADMIN`, `TEACHER`, `STUDENT`), `name`, `createdAt`.

### 6.2 Quiz Record
Stores the assessment metadata and, critically, the entire question payload.
*   **Partition Key (PK):** `QUIZ#<id>`
*   **Sort Key (SK):** `METADATA`
*   **Attributes:** `title`, `subject`, `timeLimitMinutes`, `teacherId`, `dueAt`.
*   **Optimization Strategy (Embedded Array):** The `questions` array—which contains full objects mapping `id`, `text`, `options`, `correctOptionIndex`, and the dynamically updated `difficulty`—is embedded directly within the Quiz JSON document. This guarantees that loading a full quiz into the testing interface requires exactly *one* database read operation, regardless of query complexity.

### 6.3 Attempt Record
Stores the highly granular results of a student taking a quiz.
*   **Partition Key (PK):** `USER#<studentId>`
*   **Sort Key (SK):** `ATTEMPT#<quizId>#<timestamp>`
*   **Attributes:** `score`, `totalQuestions`, `responses` (an array of integers exactly mapping to the index of the options the student selected), `completedAt`, and the dynamically generated `aiFeedback`.
*   **Optimization Strategy (Denormalization):** Highly relational data, such as the `quizTitle`, is explicitly denormalized and copied directly onto the Attempt record at the time of creation. This ensures that rendering the Student's chronological Attempt History requires querying only the Attempt records, completely eliminating the need to perform expensive table joins or secondary queries against the Quizzes table.
