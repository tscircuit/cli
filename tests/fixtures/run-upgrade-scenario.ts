import { mock } from "bun:test"
import { Command } from "commander"
import { execFileSync } from "node:child_process"

const scenario = process.argv[2]
let installAttempts = 0

// Execute a harmless local process instead of installing packages globally.
mock.module("lib/shared/get-package-manager", () => ({
  getPackageManager: () => ({
    name: "npm",
    getGlobalInstallCommand: () => "npm install -g tscircuit@latest",
    installGlobal: () => {
      installAttempts++
      const succeeds = scenario === "success" || scenario === "optional-success"
      execFileSync(process.execPath, [
        "-e",
        `process.exit(${succeeds ? 0 : 1})`,
      ])
    },
  }),
}))
mock.module("cli/main", () => ({
  program: { version: () => "1.0.0" },
}))
mock.module("ky", () => ({
  default: {
    get: () => ({
      json: async () => ({
        version: scenario === "current" ? "1.0.0" : "1.0.1",
      }),
    }),
  },
}))

if (scenario.startsWith("optional")) {
  mock.module("lib/utils/should-be-interactive", () => ({
    shouldBeInteractive: () => true,
  }))
  mock.module("lib/utils/prompts", () => ({
    prompts: async () => ({
      userWantsToUpdate: scenario !== "optional-declined",
    }),
  }))
  const { checkForTsciUpdates } = await import(
    "lib/shared/check-for-cli-update"
  )
  const updated = await checkForTsciUpdates()
  console.log(`optional-update-result=${updated}`)
  console.log("original-command-continues")
} else {
  const { registerUpgradeCommand } = await import("cli/upgrade/register")
  const program = new Command()
  registerUpgradeCommand(program)
  await program.parseAsync(["bun", "tsci", "upgrade"])
}

console.log(`install-attempts=${installAttempts}`)
