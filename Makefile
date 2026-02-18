.PHONY: inventory crack-log

inventory:
	PROJECT_ID=encoded-shape-487615-b1 REGION=us-central1 ./scripts/gcp-inventory.sh

crack-log:
	PROJECT_ID=encoded-shape-487615-b1 REGION=us-central1 ./scripts/write-crack-log.sh
