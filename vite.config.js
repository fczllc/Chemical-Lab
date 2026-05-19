import { defineConfig } from 'vite';
import { storyMediaUploadMiddleware } from './scripts/story-media-upload.mjs';

/** Vite plugin that registers the story-media admin upload endpoint in dev mode. */
const storyMediaUploadPlugin = {
  name: 'story-media-upload',
  configureServer(server) {
    server.middlewares.use(storyMediaUploadMiddleware);
  }
};

export default defineConfig({
  plugins: [storyMediaUploadPlugin],
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: {
      // Ignore files written by the admin upload endpoint to prevent HMR full-reloads
      ignored: [
        '**/public/assets/elements/discovery/**',
        '**/public/assets/elements/specimens/**',
        '**/src/data/storyMedia/media.json'
      ]
    }
  },
  build: {
    // Keep KaTeX fonts as emitted files so CSS font URLs stay inspectable and cacheable.
    assetsInlineLimit: 0
  }
});
