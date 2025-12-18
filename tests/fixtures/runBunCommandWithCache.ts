import path from "node:path"

export type BunCommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Run a bun command with isolated caches to prevent cross-test pollution.
 *
 * @param args - Command arguments (e.g., ["bun", "install"])
 * @param cwd - Working directory for the command
 * @param cacheBaseDir - Base directory for Bun caches. Use a shared directory
 *   for bun link scenarios where producer/consumer need to share the same
 *   global directory. Defaults to cwd if not provided.
 * @returns Promise with stdout, stderr, and exitCode
 */
export const runBunCommandWithCache = async (
  args: string[],
  cwd: string,
  cacheBaseDir?: string,
): Promise<BunCommandResult> => {
  const baseDir = cacheBaseDir ?? cwd
  const task = Bun.spawn(args, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "test",
      // Isolate Bun caches to prevent cross-test pollution that can cause
      // version mismatches (e.g., zod "keyValidator._parse is not a function")
      // Use a shared cacheBaseDir for bun link scenarios where producer/consumer
      // need to share the same global directory
      BUN_INSTALL_CACHE: path.join(baseDir, ".bun-install-cache"),
      BUN_INSTALL_GLOBAL_DIR: path.join(baseDir, ".bun-global"),
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(
        baseDir,
        ".bun-transpiler-cache",
      ),
    },
  })

  const stdoutPromise = new Response(task.stdout).text()
  const stderrPromise = new Response(task.stderr).text()
  const exitCode = await task.exited
  const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise])

  return { stdout, stderr, exitCode }
}
