import fs from "fs"
import { execSync } from "node:child_process"

function detectPackageManager(): "npm" | "yarn" | "pnpm" | "bun" {
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("yarn")) return "yarn"
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"

  if (fs.existsSync("yarn.lock")) return "yarn"
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm"
  if (fs.existsSync("package-lock.json")) return "npm"
  if (fs.existsSync("bun.lockb")) return "bun"
  if (fs.existsSync("bun.lock")) return "bun"

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
        if (name.startsWith("@tsci/")) {
          installCommand = `bun add ${name} --registry https://npm.tscircuit.com`
        } else {
          installCommand = `bun add ${name}`
        }
      } else {
        installCommand = `npm install ${name}`
      }
      execSync(installCommand, { stdio: "pipe", cwd })
    },
    init: ({ cwd }) => {
      let initCommand: string
      if (pm === "yarn") {
        initCommand = "yarn init -y"
      } else if (pm === "pnpm") {
        initCommand = "pnpm init"
      } else if (pm === "bun") {
        initCommand = "bun init -y"
      } else {
        initCommand = "npm init -y"
      }
      execSync(initCommand, { stdio: "inherit", cwd })
    },
    installDeps: ({ deps, cwd, dev }) => {
      let installCommand: string
      const depList = deps.join(" ")
      if (pm === "bun") {
        installCommand = dev ? `bun add -d ${depList}` : `bun add ${depList}`
      } else if (pm === "yarn") {
        installCommand = dev ? `yarn add -D ${depList}` : `yarn add ${depList}`
      } else if (pm === "pnpm") {
        installCommand = dev ? `pnpm add -D ${depList}` : `pnpm add ${depList}`
      } else {
        installCommand = dev
          ? `npm install -D ${depList}`
          : `npm install ${depList}`
      }
      execSync(installCommand, { stdio: "inherit", cwd })
    },
  }
}
