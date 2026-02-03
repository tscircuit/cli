import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { DoctorCheckResult } from "../types"

const hasBunInstalled = (): boolean => {
  const result = spawnSync("bun", ["--version"], { stdio: "ignore" })
  return result.status === 0
}

const createTempProject = (tempDir: string) => {
  const packageJsonPath = path.join(tempDir, "package.json")
  const packageJson = {
    name: "tsci-doctor-check",
    version: "0.0.0",
    private: true,
    dependencies: {
      "@tsci/does-not-exist": "0.0.0",
    },
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
}

export const checkGlobalNpmrcRegistry =
  async (): Promise<DoctorCheckResult> => {
    const name = "Global .npmrc configured for tscircuit NPM registry?"

    if (!hasBunInstalled()) {
      return {
        name,
        success: false,
        details:
          "Bun is required to verify registry settings. Install Bun and rerun `tsci doctor`.",
      }
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-doctor-"))
    try {
      createTempProject(tempDir)

      const result = spawnSync("bun", ["install"], {
        cwd: tempDir,
        env: {
          ...process.env,
          BUN_DEBUG: "network",
        },
        encoding: "utf-8",
      })

      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      const usedRegistry = /npm\.tscircuit\.com/i.test(output)
      const usedAuthToken = /authorization|_authToken|auth token/i.test(output)

      if (!usedRegistry && !usedAuthToken) {
        return {
          name,
          success: false,
          details:
            "Bun network logs did not show requests to npm.tscircuit.com or an auth token header. Ensure your global ~/.npmrc includes the tscircuit registry and token from `tsci auth setup-npmrc`.",
        }
      }

      if (!usedRegistry) {
        return {
          name,
          success: false,
          details:
            "Bun network logs did not show requests to npm.tscircuit.com. Your global ~/.npmrc may be missing the tscircuit registry configuration.",
        }
      }

      if (!usedAuthToken) {
        return {
          name,
          success: false,
          details:
            "Bun network logs did not show an auth token header for npm.tscircuit.com. Ensure your global ~/.npmrc contains //npm.tscircuit.com/:_authToken=...",
        }
      }

      return { name, success: true }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
