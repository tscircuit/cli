import { mkdir, realpath } from "node:fs/promises"
import path from "node:path"
import { lock } from "proper-lockfile"

export async function withProjectInstallLock<T>(
  projectDir: string,
  install: () => Promise<T>,
): Promise<T> {
  // Resolve symlinks so different paths to the same project share a lock.
  const projectPath = await realpath(projectDir)
  const lockDir = path.join(projectPath, ".tscircuit")
  await mkdir(lockDir, { recursive: true })
  const release = await lock(projectPath, {
    lockfilePath: path.join(lockDir, "add.lock"),
    retries: { retries: 600, factor: 1, minTimeout: 1000, maxTimeout: 1000 },
    // Heartbeats let interrupted installs recover without stealing a live lock.
    stale: 10000,
    update: 2000,
  }).catch((error) => {
    console.error(
      `Failed to acquire package installation lock in ${projectPath}: ${error}`,
    )
    throw error
  })
  try {
    return await install()
  } finally {
    await release()
  }
}
