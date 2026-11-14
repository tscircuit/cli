import { expect, test } from "bun:test"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getBuildEntrypoints } from "../../../cli/build/get-build-entrypoints"
import {
  findBoardFiles,
  findBoardFilesAsync,
} from "../../../lib/shared/find-board-files"
import { projectConfigSchema } from "../../../lib/project-config/project-config-schema"
import configJsonSchema from "../../../types/tscircuit.config.schema.json"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const workingBoard = String.raw`
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" />
  </board>
)
`
const invalidBoard = "THIS IS INTENTIONALLY INVALID TSX!"

test("ignoreEntrypoints excludes broken boards from bulk tsci build, without hiding explicit builds", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await mkdir(path.join(tmpDir, "boards", "nested"), { recursive: true })
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      includeBoardFiles: ["boards/**/*.board.tsx"],
      ignoreEntrypoints: ["boards/**/broken*.board.tsx"],
    }),
  )
  const valid = path.join(tmpDir, "boards", "working.board.tsx")
  const broken = path.join(tmpDir, "boards", "nested", "broken-v1.board.tsx")
  await writeFile(valid, workingBoard)
  await writeFile(broken, invalidBoard)

  expect((await getBuildEntrypoints({ rootDir: tmpDir })).circuitFiles).toEqual(
    [valid],
  )
  const { exitCode, stderr } = await runCommand("tsci build")
  expect(exitCode).toBe(0)
  expect(stderr).not.toContain("THIS IS INTENTIONALLY INVALID TSX!")
  const rendered = JSON.parse(
    await readFile(
      path.join(tmpDir, "dist", "boards", "working", "circuit.json"),
      "utf8",
    ),
  )
  expect(
    rendered.some((component: any) => component.type === "source_component"),
  ).toBe(true)
  await expect(
    stat(
      path.join(
        tmpDir,
        "dist",
        "boards",
        "nested",
        "broken-v1",
        "circuit.json",
      ),
    ),
  ).rejects.toBeTruthy()

  expect(
    (
      await getBuildEntrypoints({
        rootDir: tmpDir,
        fileOrDir: broken,
      })
    ).circuitFiles,
  ).toEqual([broken])
}, 30_000)

test("TypeScript config excludes matching board paths but keeps siblings", async () => {
  const { tmpDir } = await getCliTestFixture()
  await mkdir(path.join(tmpDir, "boards", "nested"), { recursive: true })
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  includeBoardFiles: ["boards/**/*.board.tsx"],',
      '  ignoreEntrypoints: ["boards/nested/**/*.board.tsx"],',
      "}",
    ].join("\n"),
  )
  const rootBoard = path.join(tmpDir, "boards", "safe.board.tsx")
  const nestedBoard = path.join(tmpDir, "boards", "nested", "broken.board.tsx")
  await writeFile(rootBoard, workingBoard)
  await writeFile(nestedBoard, invalidBoard)
  expect(await findBoardFilesAsync({ projectDir: tmpDir })).toEqual([rootBoard])
  expect((await getBuildEntrypoints({ rootDir: tmpDir })).circuitFiles).toEqual(
    [rootBoard],
  )
})

test("JSON and sync discovery honor ignoreEntrypoints, default remains unchanged", async () => {
  const { tmpDir } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  const good = path.join(tmpDir, "good.circuit.tsx")
  const broken = path.join(tmpDir, "broken.circuit.tsx")
  await writeFile(good, workingBoard)
  await writeFile(broken, invalidBoard)
  expect(findBoardFiles({ projectDir: tmpDir })).toEqual([broken, good])
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      ignoreEntrypoints: ["broken.circuit.tsx"],
    }),
  )
  expect(findBoardFiles({ projectDir: tmpDir })).toEqual([good])
  expect(await findBoardFilesAsync({ projectDir: tmpDir })).toEqual([good])
})

test("config schema exposes and validates ignoreEntrypoints", () => {
  expect(
    projectConfigSchema.parse({
      ignoreEntrypoints: ["boards/**/*.board.tsx"],
    }).ignoreEntrypoints,
  ).toEqual(["boards/**/*.board.tsx"])
  expect(configJsonSchema.properties.ignoreEntrypoints.type).toBe("array")
  expect(
    projectConfigSchema.safeParse({ ignoreEntrypoints: [""] }).success,
  ).toBe(false)
  expect(
    projectConfigSchema.safeParse({ ignoreEntrypoints: "broken" }).success,
  ).toBe(false)
})
