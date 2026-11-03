import { afterEach, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { installStandaloneDependencies } from "../../../lib/shared/standalone-dependencies"
import { createDependencyBundle } from "../../fixtures/create-dependency-bundle"

const originalBundle = process.env.TSCIRCUIT_DEPENDENCY_BUNDLE
const directories: string[] = []
afterEach(async () => {
  if (originalBundle === undefined)
    delete process.env.TSCIRCUIT_DEPENDENCY_BUNDLE
  else process.env.TSCIRCUIT_DEPENDENCY_BUNDLE = originalBundle
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})
async function fixture(
  dependencies: Record<string, string> = { tscircuit: "latest" },
) {
  const dir = await mkdtemp(join(tmpdir(), "offline-install-test-"))
  directories.push(dir)
  const bundle = join(dir, "bundle.zip")
  await createDependencyBundle(bundle)
  process.env.TSCIRCUIT_DEPENDENCY_BUNDLE = bundle
  await writeFile(join(dir, "package.json"), JSON.stringify({ dependencies }))
  return { dir, bundle }
}

test("installs and restores the complete bundle without external processes", async () => {
  const { dir } = await fixture()
  await installStandaloneDependencies(dir)
  const pkg = join(dir, "node_modules/tscircuit/package.json")
  expect(JSON.parse(await readFile(pkg, "utf8")).version).toBe("1.2.3")
  await writeFile(pkg, "broken")
  await installStandaloneDependencies(dir)
  expect(JSON.parse(await readFile(pkg, "utf8")).version).toBe("1.2.3")
})

test("unavailable versions fail before changing project files", async () => {
  const { dir } = await fixture({ tscircuit: "^99.0.0" })
  const original = await readFile(join(dir, "package.json"), "utf8")
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "No registry request",
  )
  expect(
    await Bun.file(join(dir, "node_modules/tscircuit/package.json")).exists(),
  ).toBe(false)
  expect(await readFile(join(dir, "package.json"), "utf8")).toBe(original)
})

test("adding a bundled package pins its version; URLs fail locally", async () => {
  const { dir } = await fixture({})
  await installStandaloneDependencies(dir, ["typescript@^5"])
  expect(
    JSON.parse(await readFile(join(dir, "package.json"), "utf8")).dependencies
      .typescript,
  ).toBe("5.9.3")
  await expect(
    installStandaloneDependencies(dir, ["https://example.com/a.tgz"]),
  ).rejects.toThrow("Unsupported offline package")
})

test("corrupt archive leaves an installed tree intact", async () => {
  const { dir, bundle } = await fixture()
  await installStandaloneDependencies(dir)
  const pkg = join(dir, "node_modules/tscircuit/package.json")
  const original = await readFile(pkg, "utf8")
  await createDependencyBundle(bundle, true)
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "Corrupt bundled file",
  )
  expect(await readFile(pkg, "utf8")).toBe(original)
})

test("does not overwrite unmanaged node_modules", async () => {
  const { dir } = await fixture()
  await mkdir(join(dir, "node_modules"))
  await writeFile(join(dir, "node_modules/keep"), "keep")
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "not created by standalone",
  )
  expect(await readFile(join(dir, "node_modules/keep"), "utf8")).toBe("keep")
})

test("missing bundle fails closed", async () => {
  const { dir } = await fixture()
  delete process.env.TSCIRCUIT_DEPENDENCY_BUNDLE
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "no offline dependency bundle",
  )
})

test("rejects paths outside the dependency tree before writing", async () => {
  const { dir, bundle } = await fixture()
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(await readFile(bundle))
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"))
  manifest.files["../escape"] = { sha256: "invalid" }
  zip.file("manifest.json", JSON.stringify(manifest))
  await writeFile(bundle, await zip.generateAsync({ type: "nodebuffer" }))
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "Invalid dependency bundle path",
  )
  expect(await Bun.file(join(dir, "escape")).exists()).toBe(false)
})

test("rejects symlink ancestors and missing link targets", async () => {
  const { dir, bundle } = await fixture()
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(await readFile(bundle))
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"))
  manifest.links.tscircuit = "elsewhere"
  zip.file("manifest.json", JSON.stringify(manifest))
  await writeFile(bundle, await zip.generateAsync({ type: "nodebuffer" }))
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "Invalid dependency bundle ancestor",
  )
  manifest.links = { ".bin/bad": "../../outside" }
  zip.file("manifest.json", JSON.stringify(manifest))
  await writeFile(bundle, await zip.generateAsync({ type: "nodebuffer" }))
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "Invalid dependency bundle path",
  )
})

test("rejects workspaces instead of installing a partial tree", async () => {
  const { dir } = await fixture()
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ workspaces: ["packages/*"] }),
  )
  await expect(installStandaloneDependencies(dir)).rejects.toThrow(
    "does not support workspaces",
  )
})
