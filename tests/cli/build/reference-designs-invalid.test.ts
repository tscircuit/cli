import { test, expect } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { buildReferenceDesigns } from "cli/build/reference-designs/build-reference-designs"

test("invalid preset props fail without leaving a previously published manifest", async () => {
  const projectDir = await fs.mkdtemp(
    path.join(import.meta.dir, "reference-design-invalid-"),
  )
  globalThis.deferredCleanupFns.push(() =>
    fs.rm(projectDir, { recursive: true, force: true }),
  )
  await fs.mkdir(path.join(projectDir, "dist"))
  await fs.writeFile(path.join(projectDir, "dist/reference-designs.json"), "{}")
  await fs.writeFile(
    path.join(projectDir, "index.circuit.tsx"),
    'import { z } from "zod"; export const propsSchema = z.object({ omitLed: z.boolean() }); export const presets = { invalid: { omitLed: "yes" } }; export default () => null',
  )
  await expect(
    buildReferenceDesigns({
      projectDir,
      definitions: [
        {
          name: "timer",
          displayName: "Timer",
          componentPath: "index.circuit.tsx",
          chipNames: ["NE555DR"],
        },
      ],
    }),
  ).rejects.toThrow()
  expect(
    await fs.exists(path.join(projectDir, "dist/reference-designs.json")),
  ).toBe(false)
})
