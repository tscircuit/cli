import { expect, test } from "bun:test"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const options = {
  component_name: "U1",
  gpios: [{ port: "SIGNAL", gpio_name: "CONFIG_SIGNAL", direction: "output", initial_state: "low" }],
  reserved_ports: [],
  firmware: { rtos: "nortos" },
}
const circuit = [
  { type: "source_component", ftype: "simple_chip", source_component_id: "mcu", name: "U1", manufacturer_part_number: "CC2340R52E0RGER" },
  { type: "source_port", source_component_id: "mcu", source_port_id: "pin", name: "SIGNAL", pin_number: 5, port_hints: ["DIO12"] },
]

async function writeInputs(tmpDir: string) {
  await writeFile(path.join(tmpDir, "board.circuit.json"), JSON.stringify(circuit))
  await writeFile(path.join(tmpDir, "sysconfig-options.json"), JSON.stringify(options))
}

test("export Circuit JSON with an explicit options file and default extension", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeInputs(tmpDir)
  const result = await runCommand("tsci export board.circuit.json --format sysconfig --sysconfig-options sysconfig-options.json")
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("TI validation was not run")
  const source = await readFile(path.join(tmpDir, "board.circuit.syscfg"), "utf8")
  expect(source).toContain('GPIO1.$name = "CONFIG_SIGNAL"')
  expect(source).toContain('GPIO1.gpioPin.$assign = "DIO12"')
  expect(JSON.parse(await readFile(path.join(tmpDir, "board.circuit.json"), "utf8"))).toEqual(circuit)
}, 60_000)

test("TSX, fresh JSON, and a changed TSX pin work with unchanged stable options", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeInputs(tmpDir)
  const source = `export default () => (<board width="10mm" height="10mm"><chip name="U1" manufacturerPartNumber="CC2340R52E0RGER" pinLabels={{ pin5: ["SIGNAL", "DIO12"] }} /></board>)`
  await writeFile(path.join(tmpDir, "board.tsx"), source)
  const tsx = await runCommand("tsci export board.tsx --format sysconfig --sysconfig-options sysconfig-options.json --output generated/from-tsx.syscfg --disable-parts-engine")
  expect(tsx.exitCode).toBe(0)
  const fromTsx = await readFile(path.join(tmpDir, "generated/from-tsx.syscfg"), "utf8")
  const build = await runCommand("tsci export board.tsx --format json --output fresh.circuit.json --disable-parts-engine")
  expect(build.exitCode).toBe(0)
  const json = await runCommand("tsci export fresh.circuit.json --format sysconfig --sysconfig-options sysconfig-options.json --output generated/from-json.syscfg")
  expect(json.exitCode).toBe(0)
  expect(await readFile(path.join(tmpDir, "generated/from-json.syscfg"), "utf8")).toBe(fromTsx)
  await writeFile(path.join(tmpDir, "board.tsx"), source.replace("pin5", "pin6").replace("DIO12", "DIO13"))
  const changed = await runCommand("tsci export board.tsx --format sysconfig --sysconfig-options sysconfig-options.json --output generated/changed.syscfg --disable-parts-engine")
  expect(changed.exitCode).toBe(0)
  expect(await readFile(path.join(tmpDir, "generated/changed.syscfg"), "utf8")).toBe(fromTsx.replace("DIO12", "DIO13"))
}, 120_000)

test("missing, malformed, irrelevant options and bad input fail without replacing output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeInputs(tmpDir)
  await writeFile(path.join(tmpDir, "keep.syscfg"), "keep this output")
  const missing = await runCommand("tsci export missing.tsx --format sysconfig")
  expect(missing.exitCode).toBe(1)
  expect(missing.stderr).toContain("--sysconfig-options")
  const irrelevant = await runCommand("tsci export board.circuit.json --format json --sysconfig-options sysconfig-options.json")
  expect(irrelevant.exitCode).toBe(1)
  await writeFile(path.join(tmpDir, "bad.json"), "{invalid")
  const badOptions = await runCommand("tsci export missing.tsx --format sysconfig --sysconfig-options bad.json --output keep.syscfg")
  expect(badOptions.exitCode).toBe(1)
  expect(badOptions.stderr).toContain("Invalid SysConfig options file")
  const badInput = await runCommand("tsci export bad.json --format sysconfig --sysconfig-options sysconfig-options.json --output keep.syscfg")
  expect(badInput.exitCode).toBe(1)
  const collision = await runCommand("tsci export board.circuit.json --format sysconfig --sysconfig-options sysconfig-options.json --output sysconfig-options.json")
  expect(collision.exitCode).toBe(1)
  expect(await readFile(path.join(tmpDir, "keep.syscfg"), "utf8")).toBe("keep this output")
  expect(JSON.parse(await readFile(path.join(tmpDir, "sysconfig-options.json"), "utf8"))).toEqual(options)
}, 90_000)

test("absolute paths with spaces and write failures return the right status", async () => {
  const { tmpDir } = await getCliTestFixture()
  const inputDir = path.join(tmpDir, "with spaces")
  await mkdir(inputDir)
  await writeInputs(inputDir)
  const args = [process.execPath, path.resolve("cli/main.ts"), "export", path.join(inputDir, "board.circuit.json"), "--format", "sysconfig", "--sysconfig-options", path.join(inputDir, "sysconfig-options.json"), "--output", path.join(inputDir, "output file.syscfg")]
  const task = Bun.spawn(args, { cwd: tmpDir, stdout: "pipe", stderr: "pipe", env: { ...process.env, TSCI_TEST_MODE: "true", TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config") } })
  const [stdout, stderr, exitCode] = await Promise.all([new Response(task.stdout).text(), new Response(task.stderr).text(), task.exited])
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("output file.syscfg")
  expect(await readFile(path.join(inputDir, "output file.syscfg"), "utf8")).toContain('"DIO12"')
  args[args.length - 1] = inputDir
  const failure = Bun.spawn(args, { cwd: tmpDir, stdout: "pipe", stderr: "pipe", env: { ...process.env, TSCI_TEST_MODE: "true", TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config") } })
  const [failureStdout, failureStderr, failureCode] = await Promise.all([new Response(failure.stdout).text(), new Response(failure.stderr).text(), failure.exited])
  expect(failureCode).toBe(1)
  expect(failureStderr).toContain("Error writing file")
  expect(failureStdout).not.toContain("Exported to")
}, 60_000)
