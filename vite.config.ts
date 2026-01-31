import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // SWC hata kar standard plugin use kiya
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    strictPort: false,
    // --- YE PROXY SETTING ADD KI HAI (CORS Fix ke liye) ---
    proxy: {
      '/api/hf': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hf/, ''),
        secure: false,
      },
    },
    // ------------------------------------------------------
  },
  plugins: [
    // Standard React plugin (Babel-based) jo Termux mein kabhi crash nahi hota
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].${new Date().getTime()}.js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
    // Esbuild use karenge jo ke fast hai aur Termux mein stable hai
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
  },
}));

