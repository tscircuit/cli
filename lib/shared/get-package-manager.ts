import fs from "fs"
import kleur from "kleur"
import { spawnSync } from "node:child_process"

function detectPackageManager(): "npm" | "yarn" | "pnpm" | "bun" {
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("yarn")) return "yarn"
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"

  if (fs.existsSync("bun.lockb")) return "bun"
  if (fs.existsSync("bun.lock")) return "bun"
  if (fs.existsSync("yarn.lock")) return "yarn"
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm"
  if (fs.existsSync("package-lock.json")) return "npm"

  // Check if bun is available in the shell
  try {
    const result = Bun.spawnSync(["bun", "--version"], {
      stdout: "ignore",
      stderr: "ignore",
    })
    if (result.exitCode === 0) return "bun"
  } catch (error) {
    // Bun is not available
  }

  return "npm" // Default to npm
}

export interface PackageManager {
  name: "npm" | "yarn" | "pnpm" | "bun"
  uninstall: (opts: { name: string; cwd: string }) => void
  install: (opts: { name: string; cwd: string }) => void
  update: (opts: { name: string; cwd: string }) => void
  init: (opts: { cwd: string }) => void
  installDeps: (opts: {
    deps: string[]
    cwd: string
    dev?: boolean
  }) => void
  getInitCommand: () => string
  getInstallDepsCommand: (deps: string[], dev?: boolean) => string
  installAll: (opts: { cwd: string }) => void
  getInstallAllCommand: () => string
}

function validatePackageNames(names: string[]) {
  for (const n of names) {
    const specIsSafe = /^[a-z0-9@.\-_/:]+$/i.test(n) && !n.includes("..")
    if (!specIsSafe) {
      throw new Error(`Refusing to process invalid package spec: ${n}`)
    }
  }
}

function handleSpawnOutput(output: ReturnType<typeof spawnSync>) {
  if (output.error) throw output.error
  if (output.status !== 0) {
    const errMessage = [
      `Command failed with exit code ${output.status}`,
      output.stdout ? output.stdout.toString() : "",
      output.stderr ? output.stderr.toString() : "",
    ]
      .filter(Boolean)
      .join("\n")
    const err = new Error(errMessage)
    Object.assign(err, {
      status: output.status,
      stdout: output.stdout,
      stderr: output.stderr,
    })
    throw err
  }
}

export function getPackageManager(): PackageManager {
  const pm = detectPackageManager()
  return {
    name: pm,
    uninstall: ({ name, cwd }) => {
      const names = name.split(/\s+/).filter(Boolean)
      if (names.length === 0) return
      validatePackageNames(names)

      let args: string[]
      if (pm === "yarn") args = ["remove", ...names]
      else if (pm === "pnpm") args = ["remove", ...names]
      else if (pm === "bun") args = ["remove", ...names]
      else args = ["uninstall", ...names]

      const output = spawnSync(pm, args, { stdio: "pipe", cwd })
      handleSpawnOutput(output)
    },
    install: ({ name, cwd }) => {
      const names = name.split(/\s+/).filter(Boolean)
      if (names.length === 0) return
      validatePackageNames(names)

      let args: string[]
      if (pm === "yarn") args = ["add", ...names]
      else if (pm === "pnpm") args = ["add", ...names]
      else if (pm === "bun") args = ["add", ...names]
      else args = ["install", ...names]

      console.log(kleur.gray(`> ${pm} ${args.join(" ")}`))
      const output = spawnSync(pm, args, {
        stdio: ["inherit", "pipe", "pipe"],
        cwd,
      })
      if (output.stdout) process.stdout.write(output.stdout)
      if (output.stderr) process.stderr.write(output.stderr)
      handleSpawnOutput(output)
    },
    update: ({ name, cwd }) => {
      const names = name.split(/\s+/).filter(Boolean)
      if (names.length === 0) return
      validatePackageNames(names)

      let args: string[]
      if (pm === "yarn") args = ["upgrade", ...names]
      else if (pm === "pnpm") args = ["update", ...names]
      else if (pm === "bun") args = ["update", ...names]
      else args = ["update", ...names]

      console.log(kleur.gray(`> ${pm} ${args.join(" ")}`))
      const output = spawnSync(pm, args, {
        stdio: ["inherit", "pipe", "pipe"],
        cwd,
      })
      if (output.stdout) process.stdout.write(output.stdout)
      if (output.stderr) process.stderr.write(output.stderr)
      handleSpawnOutput(output)
    },
    init: ({ cwd }) => {
      let args: string[]
      if (pm === "yarn") args = ["init", "-y"]
      else if (pm === "pnpm") args = ["init"]
      else if (pm === "bun") args = ["init", "-y"]
      else args = ["init", "-y"]

      const output = spawnSync(pm, args, { stdio: "inherit", cwd })
      handleSpawnOutput(output)
    },
    installDeps: ({ deps, cwd, dev }) => {
      if (deps.length === 0) return
      validatePackageNames(deps)

      let args: string[]
      if (pm === "bun") args = ["add", dev ? "-d" : "", ...deps].filter(Boolean)
      else if (pm === "yarn")
        args = ["add", dev ? "-D" : "", ...deps].filter(Boolean)
      else if (pm === "pnpm")
        args = ["add", dev ? "-D" : "", ...deps].filter(Boolean)
      else args = ["install", dev ? "-D" : "", ...deps].filter(Boolean)

      const output = spawnSync(pm, args, { stdio: "inherit", cwd })
      handleSpawnOutput(output)
    },
    getInitCommand,
    getInstallDepsCommand,
    installAll: ({ cwd }) => {
      let args: string[]
      if (pm === "yarn") args = ["install"]
      else if (pm === "pnpm") args = ["install"]
      else if (pm === "bun") args = ["install"]
      else args = ["install"]

      console.log(kleur.gray(`> ${pm} install`))
      const output = spawnSync(pm, args, {
        stdio: ["inherit", "pipe", "pipe"],
        cwd,
      })
      if (output.stdout) process.stdout.write(output.stdout)
      if (output.stderr) process.stderr.write(output.stderr)
      handleSpawnOutput(output)
    },
    getInstallAllCommand,
  }

  function getInitCommand() {
    if (pm === "yarn") return "yarn init -y"
    if (pm === "pnpm") return "pnpm init"
    if (pm === "bun") return "bun init -y"
    return "npm init -y"
  }

  function getInstallAllCommand() {
    if (pm === "yarn") return "yarn install"
    if (pm === "pnpm") return "pnpm install"
    if (pm === "bun") return "bun install"
    return "npm install"
  }

  function getInstallDepsCommand(deps: string[], dev?: boolean) {
    const depList = deps.join(" ")
    if (pm === "bun")
      return dev ? `bun add -d ${depList}` : `bun add ${depList}`
    if (pm === "yarn")
      return dev ? `yarn add -D ${depList}` : `yarn add ${depList}`
    if (pm === "pnpm")
      return dev ? `pnpm add -D ${depList}` : `pnpm add ${depList}`
    return dev ? `npm install -D ${depList}` : `npm install ${depList}`
  }
}
