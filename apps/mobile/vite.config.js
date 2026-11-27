import { defineConfig } from "vite";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGitHubPages ? "/TECH-PERFUMS-ADVISE/" : "/",
  build: {
    sourcemap: false,
    assetsDir: "assets",
  },
});
