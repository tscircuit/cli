import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { temporaryDirectory } from "tempy"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const runShellCommand = async (
  command: string,
  cwd: string,
  env: Record<string, string> = {},
) => {
  const [bin, ...args] = command.split(" ")
  const task = Bun.spawn([bin, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
      FORCE_COLOR: "0",
      NODE_ENV: "test",
    },
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(task.stdout).text()
  const stderr = await new Response(task.stderr).text()

  if (task.exitCode !== 0) {
    throw new Error(`Command failed (${command}): ${stderr || stdout}`)
  }

  return { stdout, stderr }
}

test("tsci transpile output can be consumed via bun link", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const producerDir = path.join(tmpDir, "producer-package")
  const consumerDir = temporaryDirectory()

  await mkdir(producerDir, { recursive: true })
  await mkdir(consumerDir, { recursive: true })

  const producerEntry = path.join(producerDir, "index.ts")

  await writeFile(
    producerEntry,
    `export const linkedValue = 42

export default () => linkedValue
`,
  )

  await writeFile(
    path.join(producerDir, "package.json"),
    JSON.stringify(
      {
        name: "linked-transpile-package",
        version: "1.0.0",
        main: "dist/index.cjs",
        module: "dist/index.js",
        types: "dist/index.d.ts",
      },
      null,
      2,
    ),
  )

  await runCommand(`tsci transpile ${producerEntry}`, {
    cwd: producerDir,
    env: { NODE_PATH: path.resolve(process.cwd(), "node_modules") },
  })
  await runShellCommand("bun link", producerDir)

  await writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "linked-consumer",
        version: "1.0.0",
      },
      null,
      2,
    ),
  )

  await runShellCommand("bun link linked-transpile-package", consumerDir)

  const consumerEntry = path.join(consumerDir, "use-linked.ts")

  await writeFile(
    consumerEntry,
    `import linkedDefault from "linked-transpile-package"

export const useLinkedValue = () => linkedDefault()
`,
  )

  const imported = await import(pathToFileURL(consumerEntry).href)

  expect(typeof imported.useLinkedValue).toBe("function")

  const distIndex = path.join(
    consumerDir,
    "node_modules",
    "linked-transpile-package",
    "dist",
    "index.js",
  )
  const transpiledOutput = await readFile(distIndex, "utf-8")
  expect(transpiledOutput).toContain("linkedValue")
}, 60_000)
