.PHONY: inventory crack-log

inventory:
	@if [ -z "$$PROJECT_ID" ] || [ -z "$$REGION" ]; then \
	  echo "Error: PROJECT_ID and REGION must be set (e.g., 'make inventory PROJECT_ID=your-project REGION=your-region')"; \
	  exit 1; \
	fi
	./scripts/gcp-inventory.sh

crack-log:
	@if [ -z "$$PROJECT_ID" ] || [ -z "$$REGION" ]; then \
	  echo "Error: PROJECT_ID and REGION must be set (e.g., 'make crack-log PROJECT_ID=your-project REGION=your-region')"; \
	  exit 1; \
	fi
	./scripts/write-crack-log.sh
