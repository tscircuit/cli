import { afterEach, expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { compareAndCreateDiff } from "../../lib/shared/compare-images"
import { convertSvgToPngBuffer } from "../../lib/shared/convert-svg-to-png"

const svg = (content: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">${content}</svg>`,
  )
const left =
  '<rect id="pcb_component_1" x="5" y="5" width="20" height="20" fill="red" />'
const right =
  '<rect id="pcb_component_2" x="45" y="5" width="20" height="20" fill="blue" />'
const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
})

test("SVG snapshots ignore generated IDs and independent element order", async () => {
  const before = svg(left + right)
  const after = svg(
    right.replace("pcb_component_2", "pcb_component_10") +
      left.replace("pcb_component_1", "pcb_component_11"),
  )
  expect(before.equals(after)).toBe(false)
  expect(
    await compareAndCreateDiff(before, after, "pcb.diff.svg", false),
  ).toEqual({ equal: true })
})

test("SVG snapshots detect visual changes and preserve the SVG diff", async () => {
  const dir = await mkdtemp(join(tmpdir(), "compare-images-"))
  directories.push(dir)
  const diffPath = join(dir, "pcb.diff.svg")
  const after = svg(left.replace('fill="red"', 'fill="green"') + right)
  expect(
    await compareAndCreateDiff(svg(left + right), after, diffPath),
  ).toEqual({ equal: false })
  expect(await readFile(diffPath)).toEqual(after)
})

test("SVG snapshots detect element order changes that alter overlapping pixels", async () => {
  const overlapping = right.replace('x="45"', 'x="10"')
  expect(
    await compareAndCreateDiff(
      svg(left + overlapping),
      svg(overlapping + left),
      "pcb.diff.svg",
      false,
    ),
  ).toEqual({ equal: false })
})

test("PNG comparison and PNG diff generation still work", async () => {
  const dir = await mkdtemp(join(tmpdir(), "compare-images-"))
  directories.push(dir)
  const diffPath = join(dir, "pcb.diff.png")
  const before = convertSvgToPngBuffer(svg(left).toString())
  const after = convertSvgToPngBuffer(svg(right).toString())
  expect(await compareAndCreateDiff(before, before, diffPath, false)).toEqual({
    equal: true,
  })
  expect(await compareAndCreateDiff(before, after, diffPath)).toEqual({
    equal: false,
  })
  expect((await readFile(diffPath)).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )
})
