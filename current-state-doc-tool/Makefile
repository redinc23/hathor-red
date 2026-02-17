.PHONY: dev test lint

dev:
	uvicorn app.main:app --reload

test:
	pytest -q

lint:
	ruff check .
