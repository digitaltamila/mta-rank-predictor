# Muppadai Rank Predictor

Production-oriented rank prediction platform for supported Indian competitive exams.

## Applications

- `frontend/`: React 19, TypeScript, Tailwind CSS, React Query, React Hook Form, Framer Motion, Chart.js.
- `backend/`: Laravel 12 API with parser, scoring, ranking, cutoff, and leaderboard foundations.
- `docs/architecture-plan.md`: audit, schema, API, UI, scalability, security, and roadmap.

## Local Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` when the API is not running at `http://localhost:8000/api`.

## Backend

The backend is a Laravel 12 API. This workstation currently has PHP 8.3; the Docker target uses PHP 8.4.

```bash
cd backend
composer install
php artisan migrate
php artisan serve
```

Seeded local admin:

```text
URL: /admin
Email: admin@muppadai.local
Password: admin123
```

Change the seeded admin password before production use.

## Cloudflare Pages

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
Environment variable:
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

The Laravel backend needs separate PHP hosting; Cloudflare Pages hosts only the React frontend.

## Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000/api/v1/health`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`
