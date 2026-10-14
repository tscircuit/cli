import { expect, test } from "bun:test"
import { getEasyEdaFootprinterSourceHints } from "lib/import/footprinter/get-easyeda-footprinter-source-hints"

test("passes supplier category tags to footprint discovery", () => {
  expect(
    getEasyEdaFootprinterSourceHints({
      title: "MBR0530T1G",
      tags: ["Diodes", "Schottky Diodes"],
      category: { name: "Diodes", id: 123 },
      dataStr: {
        head: {
          c_para: {
            package: "SOD-123",
            Category: "Rectifiers",
            "LCSC Category": ["Diodes"],
          },
        },
      },
    }),
  ).toEqual([
    "MBR0530T1G",
    "Diodes",
    "Schottky Diodes",
    "Rectifiers",
    "SOD-123",
  ])
})

test("keeps unclassified package hints without inventing a diode identity", () => {
  expect(
    getEasyEdaFootprinterSourceHints({
      title: "Generic two-pad component",
      tags: null,
      dataStr: { head: { c_para: { package: "0805", pre: "R?" } } },
    }),
  ).toEqual(["Generic two-pad component", "0805", "R?"])
})
