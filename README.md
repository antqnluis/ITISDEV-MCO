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
