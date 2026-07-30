import { expect, test } from "bun:test"
import {
  assertValidKicadPcmV1License,
  isValidKicadPcmV1License,
} from "lib/shared/kicad-pcm-license"

test("accepts licenses from the KiCad PCM v1 schema", () => {
  expect(isValidKicadPcmV1License("CC-BY-ND-4.0")).toBe(true)
  expect(() => assertValidKicadPcmV1License("CC-BY-ND-4.0")).not.toThrow()
})

test("rejects licenses outside the KiCad PCM v1 schema", () => {
  expect(isValidKicadPcmV1License("Unknown")).toBe(false)
  expect(() => assertValidKicadPcmV1License("Unknown")).toThrow(
    'Invalid KiCad PCM v1 license "Unknown"',
  )
  expect(() => assertValidKicadPcmV1License("")).toThrow(
    'Invalid KiCad PCM v1 license "(empty)"',
  )
})
