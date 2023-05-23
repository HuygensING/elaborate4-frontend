all: help

WORK_TAG = elab4-work-frontend
BUILD_TAG = elab4-build-frontend
BOSCHDOC_TAG = elab4-boschdoc-frontend
PUBLICATION_TAG = elab4-publication-frontend
VERSION = $(shell jq --raw-output .version package.json)
DOCKER_DOMAIN = registry.diginfra.net/tt

.make:
	mkdir -p .make

## work-environment

.make/docker-work: .make apps/work-environment/* common/* docker/work-environment/* package.json static/* scripts/work-environment-dist.sh
	docker build -t $(WORK_TAG):$(VERSION) --platform=linux/amd64 -f docker/work-environment/Dockerfile .
	@touch $@

.PHONY: package-work-environent-frontend
package-work-environent-frontend: .make/docker-work

## publication

.make/docker-publication: .make apps/publication/* common/* docker/publication/* package.json static/* scripts/publication-dist.sh
	docker build -t $(PUBLICATION_TAG):$(VERSION) --platform=linux/amd64 -f docker/publication/Dockerfile .
	docker tag $(PUBLICATION_TAG):$(VERSION) $(DOCKER_DOMAIN)/$(PUBLICATION_TAG):$(VERSION)
	docker push $(DOCKER_DOMAIN)/$(PUBLICATION_TAG):$(VERSION)
	@touch $@

.PHONY: package-publication-frontend
package-publication-frontend: .make/docker-publication

## boschdoc

.make/docker-boschdoc: .make apps/boschdoc/* common/* docker/boschdoc/* package.json static/* scripts/boschdoc-dist.sh
	docker build -t $(BOSCHDOC_TAG):$(VERSION) --platform=linux/amd64 -f docker/boschdoc/Dockerfile .
	@touch $@

.PHONY: package-boschdoc-frontend
package-boschdoc-frontend: .make/docker-boschdoc

## build-environment

.make/docker-build: .make docker/build-environment/* package.json
	docker build -t $(BUILD_TAG):$(VERSION) --platform=linux/amd64 -f docker/build-environment/Dockerfile .
	@touch $@

.PHONY: package-build-environment-frontend
package-build-environment-frontend: .make/docker-build

## other

.PHONY: clean
clean:
	rm -rf .make

.PHONY: install
install:
	npm install

.PHONY: audit
audit:
	npm audit

.PHONY: help
help:
	@echo "make-tools for elaborate4-frontend"
	@echo "version: $(VERSION)"
	@echo
	@echo "Please use \`make <target>', where <target> is one of:"
	@echo "  install                             to setup the dependencies"
	@echo "  audit                               to audit the dependencies"
	@echo "  package-build-environent-frontend   to build the docker image for the build-environment front-end"
	@echo "  package-work-environent-frontend    to build the docker image for the elaborate work-environment front-end"
	@echo "  package-boschdoc-frontend           to build the docker image for the elaborate boschdoc front-end"
	@echo "  package-publication-frontend        to build the docker image for the elaborate publication front-end"
	@echo "  clean                               to remove generated files"
	@echo
