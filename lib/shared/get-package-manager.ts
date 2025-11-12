import fs from "fs"
import kleur from "kleur"
import { execSync } from "node:child_process"

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

export function getPackageManager(): PackageManager {
  const pm = detectPackageManager()
  return {
    name: pm,
    uninstall: ({ name, cwd }) => {
      let uninstallCommand: string
      if (pm === "yarn") {
        uninstallCommand = `yarn remove ${name}`
      } else if (pm === "pnpm") {
        uninstallCommand = `pnpm remove ${name}`
      } else if (pm === "bun") {
        uninstallCommand = `bun remove ${name}`
      } else {
        uninstallCommand = `npm uninstall ${name}`
      }
      execSync(uninstallCommand, { stdio: "pipe", cwd })
    },
    install: ({ name, cwd }) => {
      let installCommand: string
      if (pm === "yarn") {
        installCommand = `yarn add ${name}`
      } else if (pm === "pnpm") {
        installCommand = `pnpm add ${name}`
      } else if (pm === "bun") {
        installCommand = `bun add ${name}`
      } else {
        installCommand = `npm install ${name}`
      }
      console.log(kleur.gray(`> ${installCommand}`))
      execSync(installCommand, { stdio: "inherit", cwd })
    },
    init: ({ cwd }) => {
      const initCommand = getInitCommand()
      execSync(initCommand, { stdio: "inherit", cwd })
    },
    installDeps: ({ deps, cwd, dev }) => {
      const installCommand = getInstallDepsCommand(deps, dev)
      execSync(installCommand, { stdio: "inherit", cwd })
    },
    getInitCommand,
    getInstallDepsCommand,
    installAll: ({ cwd }) => {
      const installCommand = getInstallAllCommand()
      console.log(kleur.gray(`> ${installCommand}`))
      execSync(installCommand, { stdio: "inherit", cwd })
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
