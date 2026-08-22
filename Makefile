.PHONY: install dev test format format-check lint check build preview clean

install:
	npm ci

dev:
	npm run dev

test:
	npm test

format:
	npm run format

format-check:
	npm run format:check

lint:
	npm run lint

check: test format-check lint

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf dist
