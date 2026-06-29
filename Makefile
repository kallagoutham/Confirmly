PYTHON := $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else echo python; fi)
MANAGE := $(PYTHON) manage.py

.PHONY: help install setup run m mm test shell superuser check clean-pyc

help: ## Show available Make commands.
	@awk 'BEGIN {FS = ":.*##"; printf "Available commands:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Python dependencies from requirements.txt.
	$(PYTHON) -m pip install -r requirements.txt

setup: install m ## Install dependencies and apply database migrations.

run: ## Start the Django development server.
	$(MANAGE) runserver

m: ## Apply database migrations.
	$(MANAGE) migrate

mm: ## Create new migrations for model changes.
	$(MANAGE) makemigrations

test: ## Run the Django test suite.
	$(MANAGE) test

shell: ## Open the Django shell.
	$(MANAGE) shell

superuser: ## Create a Django admin superuser.
	$(MANAGE) createsuperuser

check: ## Run Django system checks.
	$(MANAGE) check

clean-pyc: ## Remove Python cache files.
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
