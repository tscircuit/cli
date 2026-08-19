import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { buildMultiSpanViaCircuitJson } from "../../fixtures/multi-span-vias"

// Regression test for: Gerber ZIP export silently omits non-through via drill
// spans on multilayer boards (tscircuit/cli#4346).
// A 4-layer board with top-bottom, top-inner1 and inner1-bottom vias must
// produce drill files covering ALL spans, not just the default top-bottom.
test("gerbers export includes drill files for every via layer span", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitJsonPath = path.join(tmpDir, "circuit.json")
  await writeFile(circuitJsonPath, JSON.stringify(buildMultiSpanViaCircuitJson()))

  const { stderr } = await runCommand(
    `tsci export ${circuitJsonPath} -f gerbers -o ${tmpDir}/out.zip`,
  )
  expect(stderr).toBe("")

  const zip = await JSZip.loadAsync(await readFile(`${tmpDir}/out.zip`))
  const drillFiles = Object.keys(zip.files).filter((f) => f.endsWith(".drl"))

  // default span file still present
  expect(drillFiles).toContain("drill.drl")

  // non-default spans get their own files
  expect(drillFiles.some((f) => f.includes("top") && f.includes("inner1"))).toBe(
    true,
  )
  expect(
    drillFiles.some((f) => f.includes("inner1") && f.includes("bottom")),
  ).toBe(true)

  // total drill hits across all files must cover all three vias
  let totalHits = 0
  for (const f of drillFiles) {
    const content = await zip.files[f].async("string")
    totalHits += (content.match(/X-?[\d.]+Y-?[\d.]+/g) || []).length
  }
  expect(totalHits).toBe(3)
})
