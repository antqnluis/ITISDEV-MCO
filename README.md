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
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   └── utils.js
│   ├── pages/
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

   Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`. The anon key is used for authentication and all student-scoped requests so Supabase row-level security applies. `SUPABASE_SERVICE_ROLE_KEY` is optional for the current API and must remain server-only.

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

Open `frontend/index.html` directly in a browser, or serve the `frontend` folder with any static file server.

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

`SUPABASE_SERVICE_ROLE_KEY` is optional for the current API. Never place it in the frontend or commit `.env` to Git.

Start the development server:

```powershell
npm run dev
```

The API will be available at `http://localhost:9999`. To run the automated tests, use:

```powershell
npm test
```

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
