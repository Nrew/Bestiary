import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig({ command: "serve", mode: "test" }),
  defineConfig({
    test: {
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  })
);
