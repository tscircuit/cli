import { test, expect, describe } from "bun:test"
import {
  isBinaryFile,
  hasBinaryContent,
  BINARY_FILE_EXTENSIONS,
} from "lib/shared/binary-file-utils"

describe("binary-file-utils", () => {
  describe("isBinaryFile", () => {
    test("detects common binary image extensions", () => {
      expect(isBinaryFile("image.png")).toBe(true)
      expect(isBinaryFile("photo.jpg")).toBe(true)
      expect(isBinaryFile("photo.jpeg")).toBe(true)
      expect(isBinaryFile("animation.gif")).toBe(true)
      expect(isBinaryFile("icon.bmp")).toBe(true)
      expect(isBinaryFile("modern.webp")).toBe(true)
    })

    test("detects 3D model extensions", () => {
      expect(isBinaryFile("model.glb")).toBe(true)
      expect(isBinaryFile("model.gltf")).toBe(true)
      expect(isBinaryFile("model.obj")).toBe(true)
      expect(isBinaryFile("model.stl")).toBe(true)
      expect(isBinaryFile("model.step")).toBe(true)
      expect(isBinaryFile("model.stp")).toBe(true)
    })

    test("detects archive extensions", () => {
      expect(isBinaryFile("archive.zip")).toBe(true)
      expect(isBinaryFile("archive.tar")).toBe(true)
      expect(isBinaryFile("archive.gz")).toBe(true)
      expect(isBinaryFile("archive.rar")).toBe(true)
      expect(isBinaryFile("archive.7z")).toBe(true)
    })

    test("detects gerber file extensions", () => {
      expect(isBinaryFile("board.gbr")).toBe(true)
      expect(isBinaryFile("board.gtl")).toBe(true)
      expect(isBinaryFile("board.gbl")).toBe(true)
      expect(isBinaryFile("board.drl")).toBe(true)
    })

    test("detects KiCad file extensions", () => {
      expect(isBinaryFile("footprint.kicad_mod")).toBe(true)
      expect(isBinaryFile("board.kicad_pcb")).toBe(true)
      expect(isBinaryFile("project.kicad_pro")).toBe(true)
      expect(isBinaryFile("schematic.kicad_sch")).toBe(true)
    })

    test("returns false for text files", () => {
      expect(isBinaryFile("index.ts")).toBe(false)
      expect(isBinaryFile("index.tsx")).toBe(false)
      expect(isBinaryFile("index.js")).toBe(false)
      expect(isBinaryFile("style.css")).toBe(false)
      expect(isBinaryFile("readme.md")).toBe(false)
      expect(isBinaryFile("package.json")).toBe(false)
      expect(isBinaryFile("tsconfig.json")).toBe(false)
      expect(isBinaryFile(".gitignore")).toBe(false)
    })

    test("handles paths with directories", () => {
      expect(isBinaryFile("src/assets/image.png")).toBe(true)
      expect(isBinaryFile("gerbers/board.gbr")).toBe(true)
      expect(isBinaryFile("src/components/Button.tsx")).toBe(false)
    })

    test("handles uppercase extensions", () => {
      expect(isBinaryFile("IMAGE.PNG")).toBe(true)
      expect(isBinaryFile("PHOTO.JPG")).toBe(true)
      expect(isBinaryFile("archive.ZIP")).toBe(true)
    })

    test("handles mixed case extensions", () => {
      expect(isBinaryFile("image.Png")).toBe(true)
      expect(isBinaryFile("photo.JpG")).toBe(true)
    })
  })

  describe("hasBinaryContent", () => {
    test("detects null bytes in content", () => {
      const binaryBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]) // "Hel\0o"
      expect(hasBinaryContent(binaryBuffer)).toBe(true)
    })

    test("returns false for text content", () => {
      const textBuffer = Buffer.from("Hello, World!", "utf-8")
      expect(hasBinaryContent(textBuffer)).toBe(false)
    })

    test("returns false for empty buffer", () => {
      const emptyBuffer = Buffer.from([])
      expect(hasBinaryContent(emptyBuffer)).toBe(false)
    })

    test("detects null byte at the start", () => {
      const buffer = Buffer.from([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(hasBinaryContent(buffer)).toBe(true)
    })

    test("handles typical text file content", () => {
      const tsContent = `import React from "react";\nexport const App = () => <div>Hello</div>;`
      const buffer = Buffer.from(tsContent, "utf-8")
      expect(hasBinaryContent(buffer)).toBe(false)
    })

    test("handles JSON content", () => {
      const jsonContent = JSON.stringify({ name: "test", version: "1.0.0" })
      const buffer = Buffer.from(jsonContent, "utf-8")
      expect(hasBinaryContent(buffer)).toBe(false)
    })
  })

  describe("BINARY_FILE_EXTENSIONS", () => {
    test("contains expected number of extensions", () => {
      // Just verify the Set has reasonable content
      expect(BINARY_FILE_EXTENSIONS.size).toBeGreaterThan(30)
    })

    test("all extensions start with a dot", () => {
      for (const ext of BINARY_FILE_EXTENSIONS) {
        expect(ext.startsWith(".")).toBe(true)
      }
    })

    test("all extensions are lowercase", () => {
      for (const ext of BINARY_FILE_EXTENSIONS) {
        expect(ext).toBe(ext.toLowerCase())
      }
    })
  })
})
