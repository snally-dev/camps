import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

const STATIC_FILES = ["icons/icon-192.png", "icons/icon-512.png"];

function emitStaticFiles() {
  return {
    name: "emit-static-files",
    generateBundle() {
      for (const fileName of STATIC_FILES) {
        this.emitFile({
          type: "asset",
          fileName,
          source: readFileSync(fileName),
        });
      }
    },
  };
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: {
    ignorePatterns: [],
  },
  base: "/camps/",
  plugins: [emitStaticFiles()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "js/main.js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          const assetName = assetInfo.names?.[0] ?? assetInfo.name ?? "";

          if (assetName === "manifest.webmanifest") return "manifest.webmanifest";
          if (assetName === "favicon.ico") return "favicon.ico";
          if (assetName === "icon-180.png") return "icons/icon-180.png";
          if (assetName.endsWith(".css")) return "css/styles.css";
          if (assetName === "camps-logo.png") {
            return "assets/camps-logo.png";
          }

          return "assets/[name][extname]";
        },
      },
    },
  },
});
