.PHONY: toolbox toolbox-shell inventory terraform-apply

toolbox:
	docker build -t hathor-toolbox:latest -f toolbox/Dockerfile toolbox

toolbox-shell:
	docker run --rm -it -v "$(PWD):/work" --user "$$(id -u):$$(id -g)" hathor-toolbox:latest

inventory:
	./scripts/inventory.sh

terraform-apply:
	./scripts/terraform-apply.sh
