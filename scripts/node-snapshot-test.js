import { mkdtempSync, writeFileSync, existsSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { spawnSync } from "child_process"

const tmpDir = mkdtempSync(join(tmpdir(), "tsci-node-"))
writeFileSync(
  join(tmpDir, "test.board.tsx"),
  `export const TestBoard = () => (
    <board width="10mm" height="10mm">
      <chip name="U1" footprint="soic8" />
    </board>
  )`,
)

const result = spawnSync("tsci", ["snapshot", "--update", "--3d"], {
  cwd: tmpDir,
  encoding: "utf8",
})
console.log(result.stdout)
console.error(result.stderr)

if (result.status !== 0) {
  console.error("tsci snapshot failed")
  process.exit(result.status || 1)
}

const snapDir = join(tmpDir, "__snapshots__")
const pcbExists = existsSync(join(snapDir, "test.board-pcb.snap.svg"))
const schExists = existsSync(join(snapDir, "test.board-schematic.snap.svg"))
const threeExists = existsSync(join(snapDir, "test.board-3d.snap.svg"))

if (!pcbExists || !schExists || !threeExists) {
  console.error("Snapshots were not created as expected")
  process.exit(1)
}

console.log("Node snapshot smoke test passed")
