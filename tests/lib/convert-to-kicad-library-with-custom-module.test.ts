import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import { temporaryDirectory } from "tempy"
import {
  convertToKicadLibrary,
  buildKicadPcm,
  type CircuitJsonToKicadModule,
} from "lib/index"
import type {
  KicadLibraryConverterOptions,
  KicadLibraryConverterOutput,
} from "circuit-json-to-kicad"

/**
 * This test demonstrates how upstream packages (like circuit-json-to-kicad)
 * can use the CLI's convertToKicadLibrary function with their own
 * KicadLibraryConverter implementation for testing purposes.
 */

test("convertToKicadLibrary accepts custom circuit-json-to-kicad module", async () => {
  const tmpDir = temporaryDirectory()

  try {
    // Create a simple component file
    await mkdir(path.join(tmpDir, "lib"), { recursive: true })

    const componentCode = `
export const MyResistor = () => (
  <resistor resistance="1k" footprint="0402" name="R1" />
)
`
    await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "@test/custom-module-test",
        version: "1.0.0",
        type: "module",
        dependencies: {
          react: "^19.1.0",
        },
      }),
    )

    // Install dependencies
    const installProc = Bun.spawn(["bun", "install"], {
      cwd: tmpDir,
      stdout: "inherit",
      stderr: "inherit",
    })
    await installProc.exited

    // Track calls to the custom converter
    const converterCalls: KicadLibraryConverterOptions[] = []
    let runCalled = false
    let getOutputCalled = false

    // Create a custom KicadLibraryConverter that tracks calls and returns mock output
    class MockKicadLibraryConverter {
      private options: KicadLibraryConverterOptions

      constructor(options: KicadLibraryConverterOptions) {
        this.options = options
        converterCalls.push(options)
      }

      async run(): Promise<void> {
        runCalled = true
        // The real converter would scan the entrypoint and build components
        // For this test, we just verify the callbacks are wired up correctly
      }

      getOutput(): KicadLibraryConverterOutput {
        getOutputCalled = true
        // Return minimal mock output
        return {
          kicadProjectFsMap: {
            "symbols/test.kicad_sym": "(kicad_symbol_lib (version 20231120))",
            "footprints/test.pretty/test.kicad_mod": "(footprint test)",
            "fp-lib-table": "(fp_lib_table)",
            "sym-lib-table": "(sym_lib_table)",
          },
          model3dSourcePaths: [],
        }
      }
    }

    // Create the custom module
    const customModule: CircuitJsonToKicadModule = {
      KicadLibraryConverter: MockKicadLibraryConverter,
    }

    const outputDir = path.join(tmpDir, "dist", "kicad-library")

    // Call convertToKicadLibrary with the custom module
    const result = await convertToKicadLibrary({
      filePath: path.join(tmpDir, "lib", "index.tsx"),
      libraryName: "test_library",
      outputDir,
      circuitJsonToKicadModule: customModule,
    })

    // Verify the custom converter was used
    expect(converterCalls.length).toBe(1)
    expect(runCalled).toBe(true)
    expect(getOutputCalled).toBe(true)

    // Verify the options were passed correctly
    const passedOptions = converterCalls[0]
    expect(passedOptions.kicadLibraryName).toBe("test_library")
    expect(passedOptions.entrypoint).toContain("lib/index.tsx")
    expect(typeof passedOptions.buildFileToCircuitJson).toBe("function")
    expect(typeof passedOptions.getExportsFromTsxFile).toBe("function")

    // Verify the output files were written
    expect(result.outputDir).toBe(outputDir)
    expect(result.files).toContain("symbols/test.kicad_sym")
    expect(result.files).toContain("footprints/test.pretty/test.kicad_mod")
    expect(result.files).toContain("fp-lib-table")
    expect(result.files).toContain("sym-lib-table")

    // Verify the files actually exist
    expect(fs.existsSync(path.join(outputDir, "symbols/test.kicad_sym"))).toBe(
      true,
    )
    expect(
      fs.existsSync(
        path.join(outputDir, "footprints/test.pretty/test.kicad_mod"),
      ),
    ).toBe(true)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 60_000)

test("convertToKicadLibrary with PCM options passes them to custom module", async () => {
  const tmpDir = temporaryDirectory()

  try {
    await mkdir(path.join(tmpDir, "lib"), { recursive: true })

    const componentCode = `
export const MyCapacitor = () => (
  <capacitor capacitance="100nF" footprint="0603" name="C1" />
)
`
    await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "@test/pcm-test",
        version: "2.0.0",
        type: "module",
        dependencies: {
          react: "^19.1.0",
        },
      }),
    )

    const installProc = Bun.spawn(["bun", "install"], {
      cwd: tmpDir,
      stdout: "inherit",
      stderr: "inherit",
    })
    await installProc.exited

    let capturedOptions: KicadLibraryConverterOptions | null = null

    class MockKicadLibraryConverter {
      constructor(options: KicadLibraryConverterOptions) {
        capturedOptions = options
      }

      async run(): Promise<void> {}

      getOutput(): KicadLibraryConverterOutput {
        return {
          kicadProjectFsMap: {
            "symbols/test.kicad_sym": "(kicad_symbol_lib)",
            "fp-lib-table": "(fp_lib_table)",
            "sym-lib-table": "(sym_lib_table)",
          },
          model3dSourcePaths: [],
        }
      }
    }

    const customModule: CircuitJsonToKicadModule = {
      KicadLibraryConverter: MockKicadLibraryConverter,
    }

    const outputDir = path.join(tmpDir, "dist", "kicad-library-pcm")

    await convertToKicadLibrary({
      filePath: path.join(tmpDir, "lib", "index.tsx"),
      libraryName: "pcm_test_library",
      outputDir,
      isPcm: true,
      kicadPcmPackageId: "com_tscircuit_test_pcm",
      circuitJsonToKicadModule: customModule,
    })

    // Verify PCM options were passed correctly
    expect(capturedOptions).not.toBeNull()
    expect(capturedOptions!.isPcm).toBe(true)
    expect(capturedOptions!.kicadPcmPackageId).toBe("com_tscircuit_test_pcm")
    expect(capturedOptions!.kicadLibraryName).toBe("pcm_test_library")
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 60_000)

test("buildKicadPcm accepts custom circuit-json-to-kicad module", async () => {
  const tmpDir = temporaryDirectory()

  try {
    await mkdir(path.join(tmpDir, "lib"), { recursive: true })

    const componentCode = `
export const MyInductor = () => (
  <inductor inductance="10uH" footprint="0805" name="L1" />
)
`
    await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

    await writeFile(
      path.join(tmpDir, "tscircuit.config.json"),
      JSON.stringify({
        mainEntrypoint: "./lib/index.tsx",
      }),
    )

    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "@tsci/testuser.pcm-custom-module",
        version: "1.0.0",
        description: "A test component for PCM with custom module",
        type: "module",
        dependencies: {
          react: "^19.1.0",
        },
      }),
    )

    const installProc = Bun.spawn(["bun", "install"], {
      cwd: tmpDir,
      stdout: "inherit",
      stderr: "inherit",
    })
    await installProc.exited

    let capturedOptions: KicadLibraryConverterOptions | null = null

    class MockKicadLibraryConverter {
      constructor(options: KicadLibraryConverterOptions) {
        capturedOptions = options
      }

      async run(): Promise<void> {}

      getOutput(): KicadLibraryConverterOutput {
        return {
          kicadProjectFsMap: {
            "symbols/test.kicad_sym": "(kicad_symbol_lib)",
            "footprints/test.pretty/test.kicad_mod": "(footprint test)",
            "fp-lib-table": "(fp_lib_table)",
            "sym-lib-table": "(sym_lib_table)",
          },
          model3dSourcePaths: [],
        }
      }
    }

    const customModule: CircuitJsonToKicadModule = {
      KicadLibraryConverter: MockKicadLibraryConverter,
    }

    const distDir = path.join(tmpDir, "dist")

    await buildKicadPcm({
      entryFile: path.join(tmpDir, "lib", "index.tsx"),
      projectDir: tmpDir,
      distDir,
      circuitJsonToKicadModule: customModule,
    })

    // Verify the custom module was used
    expect(capturedOptions).not.toBeNull()
    expect(capturedOptions!.isPcm).toBe(true)
    expect(capturedOptions!.kicadPcmPackageId).toContain(
      "com_tscircuit_testuser",
    )

    // Verify PCM assets were generated
    expect(fs.existsSync(path.join(distDir, "pcm", "repository.json"))).toBe(
      true,
    )
    expect(fs.existsSync(path.join(distDir, "pcm", "packages.json"))).toBe(true)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 60_000)
