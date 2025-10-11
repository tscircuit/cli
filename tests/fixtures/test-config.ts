import { beforeAll } from "bun:test";

// Increase default test timeout globally
beforeAll(() => {
  // Set a much higher default timeout for all tests (120 seconds)
  // This helps with tests that involve network requests, file operations, and rendering
  // Especially important in Docker environments where operations may be slower
  Bun.jest.setTimeout(120000);
});