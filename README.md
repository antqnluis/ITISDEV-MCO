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

   Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`. The anon key is used for authentication and all student-scoped requests so Supabase row-level security applies.

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
| `POST` | `/api/profile` | Create the authenticated student's profile. |
| `GET` | `/api/profile` | Get the authenticated student's profile. |
| `PATCH` | `/api/profile` | Update the authenticated student's profile. |
| `DELETE` | `/api/profile` | Delete the authenticated student's profile. |
| `POST` | `/api/check-ins` | Create a weekly check-in. |
| `GET` | `/api/check-ins` | List the authenticated student's check-ins, newest first. |
| `GET` | `/api/check-ins/:id` | Get one weekly check-in. |
| `PATCH` | `/api/check-ins/:id` | Update one weekly check-in. |
| `DELETE` | `/api/check-ins/:id` | Delete one weekly check-in. |

Example registration body:

```json
{
  "email": "student1@example.com",
  "password": "password123",
  "student_number": "20240001"
}
```

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
