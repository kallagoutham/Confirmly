# Confirmly

Confirmly is an appointment-management platform designed to reduce missed appointments through timely reminders, secure one-click customer actions, explainable no-show risk scoring, and action-oriented business dashboards.

## MVP

The initial product will support:

- Multi-tenant business accounts
- Customer and appointment management
- Email reminders 24 hours and 2 hours before appointments
- Signed, expiring confirmation and cancellation links
- Explainable rule-based risk scores from 0–100
- Appointment event timelines and audit-friendly risk history
- Risk, attendance, and revenue-at-risk dashboard metrics

## Planned stack

- Django and Django REST Framework
- PostgreSQL
- Celery, Celery Beat, and Redis
- Docker Compose

## Project status

The first backend foundation is implemented:

- Django project configuration with SQLite for local development and PostgreSQL via environment variables
- Business, customer, appointment, and immutable appointment-event models
- Tenant-scoped customer and appointment REST APIs
- Appointment creation/update validation and event recording
- Pagination, search, filtering, and tenant-isolation tests

Lifecycle transitions, risk scoring, reminders, public action links, and the dashboard are the next implementation slices.

## Local development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Run the automated test suite with:

```bash
python manage.py test
```

Copy `.env.example` to `.env` and set the local credentials. Django loads this file
automatically. SQLite is used only when `POSTGRES_DB` is unset; otherwise Django uses
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and `POSTGRES_PORT`.

## Requirements

The complete MVP product and technical specification is available in [requirements/requirements.md](requirements/requirements.md).
