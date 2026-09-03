import fs from "fs"
import kleur from "kleur"
import { exec, execSync } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

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
  install: (opts: { name: string; cwd: string }) => Promise<void>
  update: (opts: { name: string; cwd: string }) => void
  init: (opts: { cwd: string }) => void
  installDeps: (opts: {
    deps: string[]
    cwd: string
    dev?: boolean
  }) => Promise<void>
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
    install: async ({ name, cwd }) => {
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
      // Keep the event loop available for the project lock's heartbeat.
      const { stdout, stderr } = await execAsync(installCommand, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
      })
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
    },
    update: ({ name, cwd }) => {
      let updateCommand: string
      if (pm === "yarn") {
        updateCommand = `yarn upgrade ${name}`
      } else if (pm === "pnpm") {
        updateCommand = `pnpm update ${name}`
      } else if (pm === "bun") {
        updateCommand = `bun update ${name}`
      } else {
        updateCommand = `npm update ${name}`
      }
      console.log(kleur.gray(`> ${updateCommand}`))
      const output = execSync(updateCommand, {
        stdio: ["inherit", "pipe", "pipe"],
        cwd,
      })
      if (output) {
        process.stdout.write(output)
      }
    },
    init: ({ cwd }) => {
      const initCommand = getInitCommand()
      execSync(initCommand, { stdio: "inherit", cwd })
    },
    installDeps: async ({ deps, cwd, dev }) => {
      const installCommand = getInstallDepsCommand(deps, dev)
      const { stdout, stderr } = await execAsync(installCommand, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
      })
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
    },
    getInitCommand,
    getInstallDepsCommand,
    installAll: ({ cwd }) => {
      const installCommand = getInstallAllCommand()
      console.log(kleur.gray(`> ${installCommand}`))
      const output = execSync(installCommand, {
        stdio: ["inherit", "pipe", "pipe"],
        cwd,
      })
      if (output) {
        process.stdout.write(output)
      }
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
