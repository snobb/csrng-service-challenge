BIN := ./node_modules/.bin
TS_FILES := $(shell find src/ -name '*.ts')
TEST_FILES := src/**/*.test.ts

all: dist

## help:		show this help
.PHONY: help
help:
	@sed -n 's/^##//p' Makefile

## run:		run application
.PHONY: run
run: node_modules dist
	@node --enable-source-maps dist/app.js

## test:		run tests
.PHONY: test
test: node_modules dist
	./node_modules/.bin/jest --coverage --runInBand

## test-watch:	watch files and related tests
## 		set FILE to limit to specific spec
.PHONY: test-watch
test-watch: node_modules dist
	./node_modules/.bin/jest --watchAll ${FILE}

## clean: 	clean the project
.PHONY: clean
clean:
	rm -rf coverage dist node_modules package-lock.json

dist: node_modules $(TS_FILES) tsconfig.json
	rm -rf dist
	$(BIN)/tsc -p tsconfig-build.json

node_modules: package.json package-lock.json
	npm install || (rm -rf $@; exit 1)
	test -d $@ && touch $@ ||:

package-lock.json:
	npm install
