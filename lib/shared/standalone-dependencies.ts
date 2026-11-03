import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import semver from "semver"
import { withProjectInstallLock } from "./with-project-install-lock"

export const isStandalone = () => process.env.TSCIRCUIT_STANDALONE === "1"

export interface DependencyBundleManifest {
  format: 1
  packages: Record<string, string>
  starter: Record<string, string>
  files: Record<string, { sha256: string; executable?: boolean }>
  links: Record<string, string>
}

const hash = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex")

const safePath = (name: string) => {
  if (
    !name ||
    name.includes("\\") ||
    /[<>:"|?*\x00-\x1f]/.test(name) ||
    name
      .split("/")
      .some(
        (part) => !part || part === "." || part === ".." || /[. ]$/.test(part),
      )
  ) {
    throw new Error(`Invalid dependency bundle path: ${name}`)
  }
  return name
}

export async function readDependencyBundle() {
  const source = process.env.TSCIRCUIT_DEPENDENCY_BUNDLE
  if (!source) {
    throw new Error(
      "This standalone release has no offline dependency bundle. Install a newer standalone release; no registry request was made.",
    )
  }
  const bytes =
    typeof Bun === "undefined"
      ? await fs.readFile(source)
      : Buffer.from(await Bun.file(source).arrayBuffer())
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true })
  const metadata = zip.file("manifest.json")
  if (!metadata) throw new Error("Dependency bundle is missing manifest.json")
  const manifest = JSON.parse(
    await metadata.async("string"),
  ) as DependencyBundleManifest
  if (
    manifest.format !== 1 ||
    !manifest.packages ||
    !manifest.starter ||
    !manifest.files ||
    !manifest.links
  ) {
    throw new Error("Unsupported dependency bundle manifest")
  }
  return { zip, manifest, id: hash(bytes) }
}

export async function standaloneStarterDependencies() {
  return (await readDependencyBundle()).manifest.starter
}

/** The bundle is a complete, release-resolved tree, never a registry cache. */
export async function installStandaloneDependencies(
  cwd: string,
  additions: string[] = [],
) {
  return withProjectInstallLock(cwd, async () => {
    const { zip, manifest, id } = await readDependencyBundle()
    const packagePath = path.join(cwd, "package.json")
    const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"))
    for (const spec of additions) {
      const match = /^(@[^/]+\/[^@/]+|[^@/:]+)(?:@([^/]+))?$/.exec(spec)
      if (!match) throw new Error(`Unsupported offline package: ${spec}`)
      const [, name, requested = "latest"] = match
      assertIncluded(name!, requested, manifest)
      pkg.dependencies ??= {}
      pkg.dependencies[name!] = manifest.packages[name!]
    }
    for (const section of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const [name, requested] of Object.entries(pkg[section] ?? {})) {
        assertIncluded(name, String(requested), manifest)
      }
    }
    if (pkg.workspaces || pkg.overrides || pkg.resolutions) {
      throw new Error(
        "Offline installation does not support workspaces, overrides or resolutions.",
      )
    }

    const modules = path.join(cwd, "node_modules")
    const marker = ".tsci-offline.json"
    const existing = await fs.lstat(modules).catch((error) => {
      if (error.code !== "ENOENT") throw error
      return undefined
    })
    if (existing) {
      if (existing.isSymbolicLink() || !existing.isDirectory()) {
        throw new Error(
          "Offline installation requires a regular node_modules directory.",
        )
      }
      const ownership = await fs
        .readFile(path.join(modules, marker), "utf8")
        .then(JSON.parse)
        .catch(() => null)
      if (ownership?.format !== 1) {
        throw new Error(
          "node_modules was not created by standalone. Move it aside before running tsci install; it has not been changed.",
        )
      }
    }

    // Validate all paths before writing, including ancestors of symlinks.
    const names = [
      ...Object.keys(manifest.files),
      ...Object.keys(manifest.links),
    ]
    for (const name of names) {
      safePath(name)
      if (name === marker) throw new Error("Reserved dependency bundle path")
      const parts = name.split("/")
      while (parts.length > 1) {
        parts.pop()
        const parent = parts.join("/")
        if (
          Object.hasOwn(manifest.links, parent) ||
          Object.hasOwn(manifest.files, parent)
        ) {
          throw new Error(`Invalid dependency bundle ancestor: ${parent}`)
        }
      }
    }
    for (const [name, target] of Object.entries(manifest.links)) {
      if (
        Object.hasOwn(manifest.files, name) ||
        typeof target !== "string" ||
        target.includes("\\") ||
        target.includes(":") ||
        path.posix.isAbsolute(target)
      ) {
        throw new Error(`Invalid dependency bundle link: ${name}`)
      }
      const resolved = safePath(
        path.posix.normalize(path.posix.join(path.posix.dirname(name), target)),
      )
      if (!Object.hasOwn(manifest.files, resolved)) {
        throw new Error(
          `Dependency bundle links must point to bundled files: ${name}`,
        )
      }
    }

    const stage = await fs.mkdtemp(path.join(cwd, ".tsci-install-"))
    const stagedModules = path.join(stage, "node_modules")
    const backup = path.join(stage, "previous")
    let swapped = false
    let backedUp = false
    let keepStage = false
    try {
      await fs.mkdir(stagedModules)
      for (const [name, record] of Object.entries(manifest.files)) {
        const entry = zip.file(`node_modules/${name}`)
        if (!entry) throw new Error(`Missing bundled file: ${name}`)
        const bytes = await entry.async("uint8array")
        if (hash(bytes) !== record.sha256)
          throw new Error(`Corrupt bundled file: ${name}`)
        const destination = path.join(stagedModules, name)
        await fs.mkdir(path.dirname(destination), { recursive: true })
        await fs.writeFile(destination, bytes, {
          mode: record.executable ? 0o755 : 0o644,
        })
      }
      for (const [name, target] of Object.entries(manifest.links)) {
        const destination = path.join(stagedModules, name)
        await fs.mkdir(path.dirname(destination), { recursive: true })
        if (process.platform === "win32") {
          // Windows executable shims need no symlink privilege. The bundle producer
          // permits only package-manager .bin links, never directory links.
          if (!name.split("/").includes(".bin"))
            throw new Error(`Unsupported Windows bundle link: ${name}`)
          const winTarget = target.replaceAll("/", "\\")
          await fs.writeFile(
            `${destination}.cmd`,
            `@echo off\r\nnode "%~dp0${winTarget}" %*\r\n`,
          )
          await fs.writeFile(
            destination,
            `#!/bin/sh\nexec node "$(dirname "$0")/${target}" "$@"\n`,
            { mode: 0o755 },
          )
        } else {
          await fs.symlink(target, destination)
        }
      }
      await fs.writeFile(
        path.join(stagedModules, marker),
        JSON.stringify({ format: 1, bundle: id }),
      )
      if (existing) {
        await fs.rename(modules, backup)
        backedUp = true
      }
      await fs.rename(stagedModules, modules)
      swapped = true
      if (additions.length) {
        const stagedPackage = path.join(stage, "package.json")
        await fs.writeFile(stagedPackage, `${JSON.stringify(pkg, null, 2)}\n`)
        await fs.rename(stagedPackage, packagePath)
      }
    } catch (error) {
      try {
        if (swapped) await fs.rm(modules, { recursive: true, force: true })
        if (backedUp) await fs.rename(backup, modules)
      } catch (restoreError) {
        keepStage = true
        throw new AggregateError(
          [error, restoreError],
          `Installation failed; the previous dependencies are preserved at ${backup}`,
        )
      }
      throw error
    } finally {
      if (!keepStage) await fs.rm(stage, { recursive: true, force: true })
    }
    console.log("Dependencies installed from the standalone bundle (offline).")
  })
}

function assertIncluded(
  name: string,
  requested: string,
  manifest: DependencyBundleManifest,
) {
  const version = Object.hasOwn(manifest.packages, name)
    ? manifest.packages[name]
    : undefined
  // Existing generated projects use latest. In standalone it means the shipped
  // version; new projects always record exact starter versions.
  if (
    !version ||
    (requested !== "latest" &&
      (!semver.validRange(requested) ||
        !semver.satisfies(version, requested, { includePrerelease: true })))
  ) {
    throw new Error(
      `Package/version ${name}@${requested} is not included in this standalone release. No registry request was made.`,
    )
  }
}
