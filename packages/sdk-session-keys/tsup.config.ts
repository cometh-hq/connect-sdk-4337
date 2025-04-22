import { defineConfig } from "tsup";

export default defineConfig({
    // All of our entry-points
    entry: ["src/index.ts"],
    // Format waited
    format: ["cjs", "esm"],
    // Code splitting
    clean: true,
    splitting: true,
    // Types config
    dts: {
        resolve: true,
    },
});
