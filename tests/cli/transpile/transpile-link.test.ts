import { expect, test } from "bun:test"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { runBunCommandWithCache } from "../../fixtures/runBunCommandWithCache"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("transpiled package can be linked and consumed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const producerDir = path.join(tmpDir, "linked-lib")
  const consumerDir = path.join(tmpDir, "consumer-app")

  await mkdir(producerDir, { recursive: true })
  await mkdir(consumerDir, { recursive: true })

  const producerPkg = {
    name: "linked-transpiled-lib",
    version: "1.0.0",
    main: "./dist/index.js",
    module: "./dist/index.js",
    dependencies: {
      react: "19.0.0",
    },
    exports: {
      ".": {
        import: "./dist/index.js",
        require: "./dist/index.cjs",
        types: "./dist/index.d.ts",
      },
    },
  }

  const circuitPath = path.join(producerDir, "board.tsx")
  await writeFile(
    path.join(producerDir, "package.json"),
    JSON.stringify(producerPkg, null, 2),
  )
  await writeFile(circuitPath, circuitCode)

  // Use tmpDir as the shared cache base for all bun commands so bun link works
  const producerInstall = await runBunCommandWithCache(
    ["bun", "install"],
    producerDir,
    tmpDir,
  )
  expect(producerInstall.exitCode).toBe(0)

  await runCommand(`tsci transpile ${circuitPath}`)

  const esmPath = path.join(producerDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("jsx")

  const linkResult = await runBunCommandWithCache(
    ["bun", "link"],
    producerDir,
    tmpDir,
  )
  expect(linkResult.exitCode).toBe(0)

  const consumerPkg = {
    name: "linked-transpiled-consumer",
    version: "1.0.0",
    dependencies: {
      react: "19.0.0",
    },
  }

  const consumerEntry = path.join(consumerDir, "consumer.ts")
  const consumerIndex = path.join(consumerDir, "index.tsx")
  await writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify(consumerPkg, null, 2),
  )
  const consumerInstall = await runBunCommandWithCache(
    ["bun", "install"],
    consumerDir,
    tmpDir,
  )
  expect(consumerInstall.exitCode).toBe(0)
  await writeFile(
    consumerEntry,
    `import makeBoard from "linked-transpiled-lib"

const board = makeBoard()
if (!board) {
  throw new Error("expected circuit output")
}

console.log("linked-board", typeof makeBoard, typeof board)
`,
  )
  await writeFile(
    consumerIndex,
    `import ProducerBoard from "linked-transpiled-lib"

export default () => <ProducerBoard />
`,
  )

  const consumerLink = await runBunCommandWithCache(
    ["bun", "link", "linked-transpiled-lib"],
    consumerDir,
    tmpDir,
  )
  expect(consumerLink.exitCode).toBe(0)

  const { stderr: consumerBuildStderr } = await runCommand(
    `tsci build ${consumerIndex}`,
  )
  expect(consumerBuildStderr).toBe("")

  const consumerCircuitJson = path.join(
    consumerDir,
    "dist",
    "index",
    "circuit.json",
  )
  const circuitJsonContent = await readFile(consumerCircuitJson, "utf-8")
  const consumerCircuit = JSON.parse(circuitJsonContent)
  const resistor = consumerCircuit.find(
    (entry: any) => entry.type === "source_component" && entry.name === "R1",
  )
  expect(resistor).toBeDefined()

  const consumerRun = await runBunCommandWithCache(
    ["bun", consumerEntry],
    consumerDir,
    tmpDir,
  )
  expect(consumerRun.exitCode).toBe(0)
  expect(consumerRun.stdout).toContain("linked-board function object")
}, 60_000)
