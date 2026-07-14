# ITISDEV-MCO

## File Structure

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── services/
├── docs/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## How to Run

### Backend

1. Go to the backend folder:

   ```sh
   cd backend
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a local environment file if needed:

   ```sh
   cp .env.example .env
   ```

   Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`. The anon key is used for authentication and all student-scoped requests so Supabase row-level security applies. Set `SUPABASE_SERVICE_ROLE_KEY` only when running a trusted academic-record import; never expose it to clients.

   The server uses port `9999` by default. To change it, add `PORT=your_port` to `backend/.env`.

4. Start the backend:

   ```sh
   npm run dev
   ```

   For production-style startup:

   ```sh
   npm start
   ```

5. Open the backend health check:

   ```text
   http://localhost:9999/api/health
   ```

### Frontend

The frontend will be built using:

- React
- Vite
- Tailwind CSS
- React Router

#### Initial Setup

Open a new terminal:

```sh
cd frontend
npm install
```

This installs all required frontend dependencies.

#### Start the Frontend

```sh
npm run dev
```

The development server will start at:

```text
http://localhost:5173
```

Open this URL in your browser.

> **Note:** The frontend communicates with the backend through the existing REST API, so make sure the backend server is also running.

## Windows Setup (PowerShell)

### Prerequisites

- Install [Node.js LTS](https://nodejs.org/), which includes npm.
- Create a Supabase project and keep its project URL, anon key, and (optionally) service-role key available.
- Install the Thunder Client extension in VS Code if you want to test the API from the editor.

### Configure Supabase
Copy the project URL and anon key from **Settings > API**.

### Configure and run the backend

From PowerShell, open the project folder and run:

```powershell
cd C:\path\to\ITISDEV-MCO\backend
npm install
Copy-Item .env.example .env
notepad .env
```

Set the following values in `backend/.env`:

```env
PORT=9999
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Start the development server:

```powershell
npm run dev
```

The API will be available at `http://localhost:9999`. To run the automated tests, use:

```powershell
npm test
```

### Configure and run the frontend

Open another PowerShell terminal:

```powershell
cd C:\path\to\ITISDEV-MCO\frontend
npm run dev
```

Open your browser and visit:

```text
http://localhost:5173
```

Make sure the backend server is already running before using the frontend.

### Test with Thunder Client

Use `http://localhost:9999` as the base URL. First call `POST /api/auth/register` or `POST /api/auth/login`, then copy `session.access_token` from the response. For every protected route, add this header:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a student authentication account. |
| `POST` | `/api/auth/login` | Sign in and receive a session access token. |
| `GET` | `/api/auth/me` | Get the authenticated student. |
| `POST` | `/api/auth/logout` | End the current session. |
| `PATCH` | `/api/consent` | Record acceptance of privacy notice version `v1.0`. |
| `POST` | `/api/profile` | Create the authenticated student's profile. |
| `GET` | `/api/profile` | Get the authenticated student's profile. |
| `PATCH` | `/api/profile` | Update the authenticated student's profile. |
| `DELETE` | `/api/profile` | Delete the authenticated student's profile. |
| `POST` | `/api/check-ins` | Create a weekly check-in. |
| `GET` | `/api/check-ins` | List the authenticated student's check-ins, newest first. |
| `GET` | `/api/check-ins/:id` | Get one weekly check-in. |
| `PATCH` | `/api/check-ins/:id` | Update one weekly check-in. |
| `DELETE` | `/api/check-ins/:id` | Delete one weekly check-in. |
| `POST` | `/api/academic-records` | Create a manual academic record. |
| `GET` | `/api/academic-records` | List the authenticated student's academic records. |
| `GET` | `/api/academic-records/:id` | Get one authenticated student's academic record. |
| `PATCH` | `/api/academic-records/:id` | Update one manual academic record. |
| `DELETE` | `/api/academic-records/:id` | Delete one manual academic record. |
| `POST` | `/api/course-environment-logs` | Create a course-environment log. |
| `GET` | `/api/course-environment-logs` | List the authenticated student's course-environment logs. |
| `GET` | `/api/course-environment-logs/:id` | Get one course-environment log. |
| `PATCH` | `/api/course-environment-logs/:id` | Update one course-environment log. |
| `DELETE` | `/api/course-environment-logs/:id` | Delete one course-environment log. |
| `POST` | `/api/calendar-events` | Create a manual calendar event. |
| `GET` | `/api/calendar-events?from=&to=` | List manual calendar events overlapping a time range. |
| `GET` | `/api/calendar-events/:id` | Get one manual calendar event. |
| `PATCH` | `/api/calendar-events/:id` | Update one manual calendar event. |
| `DELETE` | `/api/calendar-events/:id` | Delete one manual calendar event. |

Example registration body:

```json
{
  "email": "student1@example.com",
  "password": "password123",
  "student_number": "20240001"
}
```

To accept the privacy notice, send this authenticated request body to `PATCH /api/consent`:

```json
{
  "consent": true
}
```

The backend records the acceptance timestamp and privacy notice version `v1.0`.

For a profile request, the minimum JSON body is:

```json
{
  "college": "College of Computer Studies",
  "program": "BS Information Technology",
  "year_level": 3
}
```

For a weekly check-in, send:

```json
{
  "week_start": "2026-07-06",
  "stress_level": 4,
  "mood_level": 3,
  "sleep_quality": 2,
  "motivation_level": 3,
  "burnout_level": 4,
  "energy_level": 2,
  "available_study_hours": 8,
  "reflection": "Several deadlines are due this week."
}
```

For a course-environment log, send at least one concern rating or note. `check_in_id` is optional and must reference one of the authenticated student's weekly check-ins.

```json
{
  "course_code": "ITISDEV",
  "course_name": "IT Systems Development",
  "week_start": "2026-07-06",
  "workload_difficulty": 4,
  "unclear_instruction_level": 2,
  "concern_notes": "The implementation workload is high this week."
}
```

For a calendar event, send `event_type`, `title`, and `starts_at`. Calendar lists require `from` and `to` ISO timestamps and return events that overlap the requested range. Setting an event to `completed` records the completion time on the server.

```json
{
  "event_type": "study_block",
  "title": "Finish calendar API",
  "starts_at": "2026-07-14T09:00:00+08:00",
  "ends_at": "2026-07-14T11:00:00+08:00",
  "location": "Library"
}
```

## Development Workflow

During development, run both the backend and frontend simultaneously.

### Terminal 1 - Backend

```sh
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:9999
```

### Terminal 2 - Frontend

```sh
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

The frontend sends HTTP requests to the backend REST API while both development servers are running.
Academic records support student-created manual records and internally seeded mock records. `GET /api/academic-records` accepts `limit` (1-100, default 25), `offset` (default 0), and optional `source` (`manual` or `mock`), `record_type`, `course_code`, `due_from`, and `due_to` filters. Records are returned by due date, with undated records last. Students can create, update, and delete only manual records; mock records are created through the backend's internal `createMockAcademicRecord` service and are read-only to students.
Course-environment logs accept `limit` (1-100, default 25), `offset` (default 0), and optional `week_start`, `course_code`, and `check_in_id` filters. Results are ordered by newest week, then course code.

## Demo Student Seed

The backend includes a comprehensive demo persona for midterm testing: a working third-year IT student who is also completing OJT, competing as an athlete, serving as an organization vice president, commuting, and providing family care. The seed fills every application table with related profile, wellbeing, academic, course-environment, calendar, and AI-result data.

Add the following server-only values to `backend/.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SEED_USER_EMAIL=demo.student@example.com
SEED_USER_PASSWORD=choose_a_demo_password
SEED_STUDENT_NUMBER=20260001
```

Never expose the service-role key to the frontend or commit it to source control. Then run:

```sh
cd backend
npm run seed:demo
```

Dates are anchored to the current Monday in `Asia/Manila`, keeping overdue and upcoming midterm activity current. Rerunning the command updates the Auth credentials, deletes only this demo user's public application records, and recreates a clean dataset without duplicates. The command prints table counts and login identifiers but does not print the password or service-role key.

To run the academic engagement calculator against the records that were actually inserted into Supabase, use:

```sh
cd backend
npm run test:academic-seed
```

This command does not require the backend server. It finds the demo student using `SEED_STUDENT_NUMBER`, uses the highest workload rating from the latest course-log week, and prints the final academic engagement score with its component and requirement-count breakdown.

To calculate the Personal Wellbeing Concern Score from the latest weekly check-in actually stored in Supabase, run:

```sh
cd backend
npm run test:wellbeing-seed
```

This read-only command also works without the backend server. It finds the demo student using `SEED_STUDENT_NUMBER`, selects the latest weekly check-in, and prints its final concern score, raw ratings, and normalized component values.

To calculate the Logistical Load Concern Score from the profile and latest weekly check-in stored in Supabase, run:

```sh
cd backend
npm run test:logistical-seed
```

This read-only command does not require the backend server. It uses the latest weekly study-hour value when available, falls back to the profile value, and prints the final score, calculation inputs, components, and derived values. Internet concern remains unavailable because it is not present in the current schema.

To calculate the Role Load Concern Score from the profile stored in Supabase, run:

```sh
cd backend
npm run test:role-seed
```

This read-only command does not require the backend server. It maps the seeded profile's caregiving, athletics, and organization responsibilities into the calculator and prints the final score, calculation inputs, components, and derived values. Perceived workload and the role-hours ceiling remain unavailable because they are not present in the current schema.

To calculate the Course Environment Concern Score from the latest course-log week stored in Supabase, run:

```sh
cd backend
npm run test:course-environment-seed
```

This read-only command does not require the backend server. It finds the student using `SEED_STUDENT_NUMBER`, calculates each course score from the latest available `week_start`, and prints the weekly score, course breakdown, highest-concern course, and serious-peer-concern indicator.
