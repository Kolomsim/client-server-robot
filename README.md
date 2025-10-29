# Project

Simple robotics dashboard (Frontend: Vite + React + TypeScript, Backend: FastAPI + PostgreSQL).

## Quick start (development)

1. Backend

- Create a virtual environment and install dependencies:

```cmd
cd "c:\Users\Maxim Kolomiets\Desktop\!ИФСТ\project\server"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

- Create `server/.env` (do not commit):

```
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
```

- Run backend:

```cmd
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. Frontend

```cmd
cd "c:\Users\Maxim Kolomiets\Desktop\!ИФСТ\project\client"
npm install
# create client/.env (do not commit):
# VITE_API_URL=http://localhost:8000
npm run dev
```

## GitHub

See instructions in repository root for initializing git, creating remote and pushing. Ensure `.env` files are not committed and remove secrets from history if they were.
