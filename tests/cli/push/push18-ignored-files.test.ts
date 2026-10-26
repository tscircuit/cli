import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

for (const transport of ["", "--no-compress"]) {
  for (const includeDist of [false, true]) {
    test(`push respects ignoredFiles with ${transport || "default compression"}, includeDist=${includeDist}`, async () => {
      const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
        loggedIn: true,
      })
      const files = {
        "package.json": JSON.stringify({
          name: "@tsci/test-user.ignored-files-test",
          version: "1.0.0",
        }),
        "index.circuit.tsx": "export default () => <board />",
        "tscircuit.config.json": JSON.stringify({
          ignoredFiles: ["datasheets/**", "dist/private/**"],
        }),
        "datasheets/test.txt": "Harmless excluded dummy",
        "dist/index.js": "// Public build output",
        "dist/private/test.txt": "Harmless excluded build output",
      }
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(tmpDir, filePath)
        fs.mkdirSync(path.dirname(fullPath), { recursive: true })
        fs.writeFileSync(fullPath, content)
      }

      const args = [transport, ...(includeDist ? ["--include-dist"] : [])]
        .filter(Boolean)
        .join(" ")
      const { exitCode, stderr, stdout } = await runCommand(`tsci push ${args}`)

      expect(exitCode).toBe(0)
      expect(stderr).toBe("")
      if (!transport) {
        expect(stdout).toContain("Uploaded archive")
        expect(stdout).not.toContain("falling back")
      }
      const publishedPackage = registryDb.packages.find(
        (pkg) => pkg.name === "test-user/ignored-files-test",
      )
      const release = registryDb.packageReleases.find(
        (release) =>
          release.package_id === publishedPackage?.package_id &&
          release.version === "1.0.0",
      )!
      expect(release).toBeDefined()
      const uploadedPaths = registryDb.packageFiles
        .filter(
          (file) => file.package_release_id === release.package_release_id,
        )
        .map((file) => file.file_path)
      expect(uploadedPaths.sort()).toEqual(
        [
          "index.circuit.tsx",
          "package.json",
          "tscircuit.config.json",
          ...(includeDist ? ["dist/index.js"] : []),
        ].sort(),
      )
    }, 30_000)
  }
}
