import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  copyCoreVersions,
  fetchCoreManifest,
  updatePackageJson,
} from "../../scripts/copy-core-versions"

test("copies core's exact converter specs without taking ownership of shared dependencies", () => {
  const current = {
    devDependencies: {
      "circuit-json-to-step": "^0.0.47",
      "circuit-json-to-altium": "github:tscircuit/circuit-json-to-altium#old",
      "@tscircuit/circuit-json-to-drawing":
        "https://jscdn.tscircuit.com/drawing/old.tgz",
      tscircuit: "0.0.3031-libonly",
      "@types/bun": "^1.2.2",
    },
  }
  const core = {
    devDependencies: {
      "circuit-json-to-step": "^0.0.63",
      "circuit-json-to-altium": "github:tscircuit/circuit-json-to-altium#new",
      "@tscircuit/circuit-json-to-drawing":
        "https://jscdn.tscircuit.com/drawing/new.tgz",
      "circuit-json-to-gltf": "^0.0.164",
      "@types/bun": "^1.2.16",
    },
  }
  const updated = copyCoreVersions(current, core)
  expect(updated).toEqual({
    ...current.devDependencies,
    "circuit-json-to-step": "^0.0.63",
    "circuit-json-to-altium": "github:tscircuit/circuit-json-to-altium#new",
    "@tscircuit/circuit-json-to-drawing":
      "https://jscdn.tscircuit.com/drawing/new.tgz",
  })
  expect(current.devDependencies["circuit-json-to-step"]).toBe("^0.0.47")
  expect(copyCoreVersions({ devDependencies: updated }, core)).toEqual(updated)
})

test("supports older core releases and gives runtime declarations precedence", () => {
  const current = { devDependencies: { "circuit-json-to-step": "^0.0.63" } }
  expect(copyCoreVersions(current, {})).toEqual(current.devDependencies)
  expect(
    copyCoreVersions(current, {
      devDependencies: { "circuit-json-to-step": "^0.0.47" },
      dependencies: { "circuit-json-to-step": "0.0.50" },
    }),
  ).toEqual({ "circuit-json-to-step": "0.0.50" })
})

test("fetches the requested published core version and rejects invalid registry responses", async () => {
  const manifest = {
    name: "@tscircuit/core",
    version: "0.0.2279",
    devDependencies: { "circuit-json-to-step": "^0.0.63" },
  }
  const fetchManifest = async (url: string, init: RequestInit) => {
    expect(url).toBe("https://registry.npmjs.org/@tscircuit%2fcore/0.0.2279")
    expect(init.signal).toBeInstanceOf(AbortSignal)
    return Response.json(manifest)
  }
  expect(await fetchCoreManifest("0.0.2279", fetchManifest)).toEqual(manifest)
  await expect(fetchCoreManifest("../latest", fetchManifest)).rejects.toThrow(
    "CORE_VERSION",
  )
  await expect(
    fetchCoreManifest(
      "0.0.2279",
      async () => new Response(null, { status: 404 }),
    ),
  ).rejects.toThrow("HTTP 404")
  for (const invalid of [
    { ...manifest, name: "another-package" },
    { ...manifest, version: "0.0.2280" },
    { name: "@tscircuit/core", version: "0.0.2279" },
  ]) {
    await expect(
      fetchCoreManifest("0.0.2279", async () => Response.json(invalid)),
    ).rejects.toThrow("core dependency manifest")
  }
  expect(
    await fetchCoreManifest("latest", async () => Response.json(manifest)),
  ).toEqual(manifest)
})

test("updates only converter devDependencies on disk and leaves an unchanged manifest untouched", async () => {
  const root = await mkdtemp(join(tmpdir(), "cli-core-converters-"))
  try {
    const packagePath = join(root, "package.json")
    const current = {
      name: "@tscircuit/cli",
      dependencies: { typescript: "~5.9.3" },
      peerDependencies: { tscircuit: "*" },
      overrides: { altiumts: "0.0.59" },
      devDependencies: {
        "circuit-json-to-step": "^0.0.47",
        tscircuit: "0.0.3087-libonly",
      },
    }
    await writeFile(packagePath, `${JSON.stringify(current, null, 2)}\n`)
    const core = {
      name: "@tscircuit/core",
      version: "0.0.2279",
      devDependencies: {
        "circuit-json-to-step": "^0.0.63",
        "circuit-json-to-gltf": "^0.0.164",
      },
    }
    expect(await updatePackageJson(packagePath, core)).toBe(1)
    expect(JSON.parse(await readFile(packagePath, "utf8"))).toEqual({
      ...current,
      devDependencies: {
        ...current.devDependencies,
        "circuit-json-to-step": "^0.0.63",
      },
    })
    const compact = JSON.stringify(
      JSON.parse(await readFile(packagePath, "utf8")),
    )
    await writeFile(packagePath, compact)
    expect(await updatePackageJson(packagePath, core)).toBe(0)
    expect(await readFile(packagePath, "utf8")).toBe(compact)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
