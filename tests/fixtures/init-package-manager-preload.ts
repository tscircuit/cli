import { mock } from "bun:test"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import type { PackageManager } from "../../lib/shared/get-package-manager"

mock.module(
  new URL("../../lib/shared/get-package-manager.ts", import.meta.url).pathname,
  () => ({
    getPackageManager: () => ({
      installDeps: async (
        options: Parameters<PackageManager["installDeps"]>[0],
      ) => {
        writeFileSync(
          join(options.cwd, ".test-installed-dependencies.json"),
          JSON.stringify(options),
        )
      },
    }),
  }),
)
