import { mock } from "bun:test"
import { Command } from "commander"

const scenario = process.argv[2]
let installAttempts = 0

// Execute a harmless local process in place of the package manager, including its exit status.
mock.module("lib/shared/get-dep-install-command", () => ({
  getGlobalDepsInstallCommand: () => {
    installAttempts++
    return `"${process.execPath}" -e "process.exit(${scenario === "success" ? 0 : 1})"`
  },
}))
mock.module("lib/shared/get-package-manager", () => ({
  getPackageManager: () => ({ name: "npm" }),
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

if (scenario === "optional") {
  mock.module("lib/utils/should-be-interactive", () => ({
    shouldBeInteractive: () => true,
  }))
  mock.module("lib/utils/prompts", () => ({
    prompts: async () => ({ userWantsToUpdate: true }),
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
