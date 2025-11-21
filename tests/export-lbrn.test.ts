/** @jsxImportSource @tscircuit/props */
import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import {
  exportSnippet,
  ALLOWED_EXPORT_FORMATS,
} from "lib/shared/export-snippet"

test("lbrn export is supported", async () => {
  expect(ALLOWED_EXPORT_FORMATS).toContain("lbrn")

  const tempDir = await fs.mkdtemp(path.join(process.cwd(), "tmp-lbrn-"))
  const filePath = path.join(tempDir, "temp.circuit.tsx")

  await fs.writeFile(
    filePath,
    [
      'const Circuit = () => <board width="10mm" height="10mm" />;',
      "export default Circuit;",
    ].join("\n"),
  )

  type SuccessPayload = {
    outputDestination: string
    outputContent: string | Buffer
  }
  let successPayload: SuccessPayload | null = null

  await exportSnippet({
    filePath,
    format: "lbrn",
    writeFile: false,
    onExit: (code) => {
      throw new Error(`exportSnippet exited with code ${code}`)
    },
    onError: (message) => {
      throw new Error(message)
    },
    onSuccess: (data) => {
      successPayload = data
    },
  })

  if (successPayload === null) {
    throw new Error("Expected lbrn export to succeed")
  }

  const payload: SuccessPayload = successPayload

  expect(payload.outputDestination.endsWith(".lbrn")).toBe(true)
  expect(typeof payload.outputContent).toBe("string")
  expect((payload.outputContent as string).includes("LightBurnProject")).toBe(
    true,
  )

  await fs.rm(tempDir, { recursive: true, force: true })
})
