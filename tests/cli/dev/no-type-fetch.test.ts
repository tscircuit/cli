import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

/**
 * This test verifies that the dev server does NOT try to fetch types
 * for @tsci/ packages from the registry API, since types are now
 * included inside the modules themselves.
 *
 * Previously this would cause errors like:
 *   Failed to fetch types for @tsci/adom-inc.molecule
 */
test("dev server should not fetch types for @tsci/ packages (types are included in modules)", async () => {
  const fixture = await getCliTestFixture()

  const devServerPort = await getPort()

  // Start with a simple snippet without @tsci/ imports
  await Bun.write(
    path.join(fixture.tmpDir, "snippet.tsx"),
    `export const MyCircuit = () => <></>`,
  )

  await Bun.write(path.join(fixture.tmpDir, "package.json"), "{}")

  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: path.join(fixture.tmpDir, "snippet.tsx"),
  })

  await devServer.start()

  // Simulate a file change that adds a @tsci/ import
  const updatedContent = `
    import { useMolecule } from "@tsci/adom-inc.molecule"
    export const MyCircuit = () => <></>
  `
  fs.writeFileSync(path.join(fixture.tmpDir, "snippet.tsx"), updatedContent)

  // Verify that NO type files were fetched/created for the @tsci/ package
  // (since types are now bundled in modules, not fetched from registry)
  const typePath = path.join(
    fixture.tmpDir,
    "node_modules/@tsci/adom-inc.molecule/index.d.ts",
  )
  expect(fs.existsSync(typePath)).toBe(false)

  await devServer.stop()
}, 10_000)
