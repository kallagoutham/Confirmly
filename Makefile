ENV_FILE ?= dbconnection.env
COMPOSE := ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE)
MANAGE := $(COMPOSE) run --rm web python manage.py

.PHONY: help build run stop restart logs m mm test shell superuser check clean-pyc

help: ## Show available Make commands.
	@awk 'BEGIN {FS = ":.*##"; printf "Available commands:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker Compose services.
	$(COMPOSE) build

run: ## Start all Docker Compose services.
	$(COMPOSE) up --build

stop: ## Safely stop Docker Compose services without deleting containers or volumes.
	$(COMPOSE) stop

restart: stop run ## Safely restart Docker Compose services.

logs: ## Follow Docker Compose service logs.
	$(COMPOSE) logs -f

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
	$(COMPOSE) run --rm web find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	$(COMPOSE) run --rm web find . -type f -name "*.pyc" -delete
