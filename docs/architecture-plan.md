# Muppadai Rank Predictor Architecture Plan

## 1. Project Audit

The workspace was empty and not a Git repository when development started. No existing application, database schema, frontend design system, CI pipeline, or deployment manifests were present.

Implemented foundation:

- `frontend/`: React 19, TypeScript, Vite, Tailwind CSS 4, React Query, React Hook Form, Framer Motion, Chart.js, shadcn-style source components.
- `backend/`: Laravel 12 application scaffold with API routing, prediction-domain migrations, models, services, repositories, controllers, validation, and rate limiting.
- `docs/`: architecture record for product, data, API, UI, security, scalability, and roadmap decisions.

Local toolchain note: PHP 8.3.10 is installed on this workstation. The application is structured for Laravel 12, and deployment Docker targets PHP 8.4.

## 2. Domain Model

Core tables:

- `exams`: admin-managed active exam catalog, provider, family, metadata.
- `exam_sections`: section definitions for subject-wise analytics.
- `scoring_rules`: versioned positive, negative, unanswered marks.
- `historical_cutoffs`: uploaded cutoff records by exam, year, category, and optional state.
- `prediction_settings`: configurable selection probability thresholds.
- `response_sheets`: encrypted candidate and source URL data, hash-based deduplication, parsed payload.
- `response_questions`: normalized question ID, selected answer, correct answer, status, marks.
- `prediction_runs`: immutable score, rank, percentile, category/state/gender/community ranks, cutoff comparison.

Ranking indexes:

- `prediction_runs(exam_id, score)`
- `prediction_runs(exam_id, category, score)`
- `prediction_runs(exam_id, state, score)`
- `prediction_runs(exam_id, created_at)`

PII controls:

- Source URL, candidate name, and roll number use Laravel encrypted casts.
- Raw provider payload is stored separately from normalized scoring records.
- Public result IDs use UUIDs.

## 3. API Architecture

Versioned base path: `/api/v1`

Public endpoints:

- `GET /health`
- `POST /predictions`
- `GET /leaderboard`

Authenticated admin/user surface planned behind Sanctum:

- `GET /me`
- Exam CRUD
- Scoring rule CRUD
- Cutoff upload and CRUD
- Prediction setting CRUD
- User management
- Advertisement management
- Blog and SEO management

First prediction flow:

1. Validate Digialm URL.
2. Download HTML with timeout and retry.
3. Select parser by provider.
4. Extract metadata, question IDs, selected answers, correct answers.
5. Match parsed exam name to active configured exam.
6. Apply active scoring rule.
7. Count higher scores for overall and configured dimensions.
8. Compute percentile with the provided formula.
9. Compare against latest historical cutoff and probability settings.
10. Persist response sheet, questions, and prediction run.
11. Return stable JSON resource to the React client.

## 4. Folder Structure

Backend:

- `app/Http/Controllers/Api/V1`: versioned API controllers.
- `app/Http/Requests`: request validation.
- `app/Http/Resources`: stable response contracts.
- `app/Models`: Eloquent persistence models.
- `app/Repositories`: query and persistence boundaries.
- `app/Services/ResponseSheets`: provider parser architecture.
- `app/Services/Scoring`: configurable scoring engine.
- `app/Services/Prediction`: rank, percentile, and probability logic.

Frontend:

- `src/api`: typed API client and endpoint calls.
- `src/components`: product components.
- `src/components/ui`: shadcn-style primitives owned by the codebase.
- `src/lib`: shared utilities and content configuration.
- `src/assets`: generated and static product assets.

## 5. UI Wireframes

Mobile landing:

```text
[Header: Muppadai | Theme]
[Hero image background]
Muppadai Rank Predictor
Predict Your Rank Before Official Results
[Response Sheet URL input]
[Calculate Rank]
[Trust signals]
[Feature grid: 1 column]
[How it works: stacked steps]
[Exam support groups]
[FAQ accordion]
```

Desktop landing:

```text
[Sticky header: Brand | Features Exams FAQ | Theme]
[Hero: full-width generated analytics visual]
  Left overlay:
    Label
    H1
    Subtitle
    URL form
    Trust signals
[Feature grid: 4 columns]
[How it works: 2-column intro + steps]
[Exam support: navy band, 5 columns]
[FAQ accordion]
```

Dashboard module target:

```text
[Candidate summary]
[Score | Rank | Percentile | Probability]
[Correct vs Wrong chart]
[Cutoff comparison chart]
[Subject-wise table]
[Time-wise analysis]
```

Admin module target:

```text
[Sidebar]
[KPI strip: users, predictions, active exams, traffic]
[Exam management table]
[Cutoff import panel]
[Prediction settings editor]
[SEO/blog/ads management]
```

## 6. Scalability Concerns

- URL ingestion should move to queued jobs when provider latency or traffic spikes make synchronous processing expensive.
- Ranking by count queries is correct for the first release; at lakh-scale, add Redis sorted sets per exam and dimensions for hot leaderboards.
- Store normalized response questions separately from raw payload to keep analytics queries indexed and compact.
- Cache leaderboard and rank counts with short TTLs and invalidate around bulk imports if precision windows become unacceptable.
- Use rate limiting per IP and authenticated user; add provider-domain allowlist and SSRF protections before enabling additional providers.
- Keep cutoff uploads asynchronous with validation reports for large CSV/Excel files.
- Add read replicas for leaderboard and analytics endpoints during result season.

## 7. Security Baseline

- Laravel validation blocks unsupported providers.
- Prediction submissions use a named throttle.
- PII is encrypted at rest through Eloquent casts.
- SQL injection protection is handled through Eloquent/query bindings.
- React renders API data as text, not unsafe HTML.
- Admin routes should use Sanctum, role policies, audit logs, and CSRF-protected session flows.
- Nginx should enforce request-size limits, security headers, gzip/brotli, and HTTPS termination upstream.

## 8. Implementation Roadmap

Phase 1:

- Architecture documentation.
- Landing page and response URL form.
- Digialm parser architecture.
- Configurable scoring engine.
- Prediction and leaderboard API.
- Core database schema.

Phase 2:

- Admin authentication with Sanctum.
- Exam, scoring rule, cutoff, and prediction setting CRUD.
- CSV/Excel cutoff import queue.
- Candidate dashboard result page.

Phase 3:

- Redis sorted-set rank engine.
- Queue-based response sheet processing.
- Subject-wise and time-wise analytics.
- Leaderboard UI with filters and pagination.

Phase 4:

- Blog, advertisement, and SEO management.
- Dynamic meta, Open Graph, and schema markup.
- CI/CD, observability, backup, and load testing.
