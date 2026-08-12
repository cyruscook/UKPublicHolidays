// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.GITHUB_ACTIONS === "true" && repositoryName && !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}`
    : undefined;

export default defineConfig({ base });
