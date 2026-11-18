import { expect, test } from "bun:test"
import { parseCircuithubExportClassification } from "lib/circuithub/circuithub-api"

test("--export-classification becomes CircuitHub's classification object", () => {
  expect(parseCircuithubExportClassification("EAR99")).toEqual({ tag: "EAR99" })
  expect(parseCircuithubExportClassification("ear99")).toEqual({ tag: "EAR99" })
  expect(parseCircuithubExportClassification("NotExportControlled")).toEqual({
    tag: "NotExportControlled",
  })
  expect(parseCircuithubExportClassification("3a001")).toEqual({
    tag: "ECCN",
    contents: "3A001",
  })
  expect(() => parseCircuithubExportClassification("public")).toThrow(
    "Unknown export classification",
  )
})
