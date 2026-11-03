import { execFile, execFileSync } from "node:child_process"
import { promisify } from "node:util"
import { getNodeRuntime } from "../../cli/node-runtime.js"
import type { PackageManager } from "./get-package-manager"

const execFileAsync = promisify(execFile)

/** Execute an explicitly selected runtime with argv, never a shell command. */
export function getBunPackageManager(): PackageManager {
  const runtime = getNodeRuntime()
  const names = (name: string | string[]) =>
    Array.isArray(name) ? name : [name]
  const display = (args: string[]) => {
    const quote = (value: string) =>
      process.platform === "win32"
        ? `'${value.replaceAll("'", "''")}'`
        : `'${value.replaceAll("'", "'\\''")}'`
    const command = [runtime.executable, ...runtime.args, ...args]
      .map(quote)
      .join(" ")
    return process.platform === "win32"
      ? `$env:BUN_BE_BUN='1'; & ${command}`
      : `BUN_BE_BUN=1 ${command}`
  }
  const sync = (args: string[], cwd: string) => {
    console.log(`> ${display(args)}`)
    execFileSync(runtime.executable, [...runtime.args, ...args], {
      cwd,
      env: runtime.env,
      stdio: "inherit",
    })
  }
  const asyncRun = async (args: string[], cwd: string) => {
    console.log(`> ${display(args)}`)
    const { stdout, stderr } = await execFileAsync(
      runtime.executable,
      [...runtime.args, ...args],
      {
        cwd,
        env: runtime.env,
        maxBuffer: 10 * 1024 * 1024,
      },
    )
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  }
  const addArgs = (deps: string[], dev?: boolean) => [
    "add",
    ...(dev ? ["-d"] : []),
    ...deps,
  ]
  return {
    name: "bun",
    uninstall: ({ name, cwd }) => sync(["remove", ...names(name)], cwd),
    install: ({ name, cwd }) => asyncRun(addArgs(names(name)), cwd),
    update: ({ name, cwd }) => sync(["update", ...names(name)], cwd),
    init: ({ cwd }) => sync(["init", "-y"], cwd),
    installDeps: ({ deps, cwd, dev }) => asyncRun(addArgs(deps, dev), cwd),
    installAll: ({ cwd }) => sync(["install"], cwd),
    installGlobal: ({ name, cwd }) =>
      sync(["install", "-g", ...names(name)], cwd),
    getInitCommand: () => display(["init", "-y"]),
    getInstallDepsCommand: (deps, dev) => display(addArgs(deps, dev)),
    getInstallAllCommand: () => display(["install"]),
    getGlobalInstallCommand: (name) =>
      display(["install", "-g", ...names(name)]),
  }
}
