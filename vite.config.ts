import { defineConfig, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  return {
    plugins: [
      react(),
      mode === "analyze" &&
        visualizer({
          filename: "dist/stats.html",
          open: true,
          gzipSize: true,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target:
        process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
      minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
      sourcemap: !!process.env.TAURI_DEBUG,
      // Optimize chunking for faster initial load
      rollupOptions: {
        output: {
          manualChunks: {
            // State management
            'vendor-state': ['zustand', 'immer'],
            // Form handling - can be loaded when editing
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // UI components — keep ALL @radix-ui primitives the app uses in
            // one shared chunk so they aren't duplicated into the main
            // bundle (or worse, pulled into vendor-editor as a circular
            // dependency, which Vite warns about).
            'vendor-ui': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
            ],
            'vendor-motion': ['framer-motion'],
          },
        },
      },
      // The main chunk includes the lazy form/editor surface; keep the release
      // budget explicit after removing the circular editor vendor split.
      chunkSizeWarningLimit: 1300,
    },

    assetsInclude: ["./src/assets/icons/**/*.svg"],
  };
});
