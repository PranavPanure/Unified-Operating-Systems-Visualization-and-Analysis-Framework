.PHONY: install dev build test typecheck lint api-test api-lint api-migrate verify down

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

typecheck:
	npm run typecheck

lint: api-lint
	npm run lint

verify: typecheck test api-test api-lint build

api-test:
	python -m pytest apps/api/tests

api-lint:
	python -m ruff check apps/api/app apps/api/tests

api-migrate:
	cd apps/api && python -m alembic upgrade head

down:
	docker compose down
