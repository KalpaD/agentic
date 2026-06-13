.PHONY: dev build test test-integration down logs migrate migrate-rollback seed

## dev: Start all services in development mode with hot-reload
dev:
	docker compose up --build

## build: Build production Docker images
build:
	docker compose build --target production

## test: Run unit tests inside the api and frontend containers
test:
	docker compose run --rm api npx vitest run
	docker compose run --rm frontend npx vitest run

## test-integration: Bring up the full stack and run integration tests
test-integration:
	docker compose up -d
	docker compose run --rm api npx vitest run --config vitest.integration.config.ts
	docker compose down

## down: Stop and remove all containers
down:
	docker compose down

## logs: Tail logs from all running services
logs:
	docker compose logs -f

## migrate: Run pending database migrations
migrate:
	docker compose run --rm api npx knex --knexfile knexfile.ts migrate:latest

## migrate-rollback: Rollback the last batch of database migrations
migrate-rollback:
	docker compose run --rm api npx knex --knexfile knexfile.ts migrate:rollback

## seed: Populate the database with test users (alice + bob, password: password123)
seed:
	docker compose run --rm api npx knex --knexfile knexfile.ts seed:run
