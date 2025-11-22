import { expect, test } from "bun:test"
import { join } from "node:path"
import { existsSync, readFileSync, mkdirSync, copyFileSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { spawnSync } from "node:child_process"

test(
  "tsci install espressif/kicad-libraries: full integration test",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Install the KiCad library from GitHub (simulating: bun add https://github.com/espressif/kicad-libraries)
    const { stdout } = await runCommand(
      "tsci install espressif/kicad-libraries",
    )

    // Snapshot the installation output
    expect(stdout).toMatchInlineSnapshot(`
      "Installing espressif/kicad-libraries...
      No package.json found. Generating a new one.
      Created: /tmp/d4155ad285c0047822a3b1e33370db94/package.json
      Creating .npmrc with tscircuit registry configuration.
      No @tsci dependencies detected in circuit files.
      Installing dependencies using bun...
      > bun install
      bun install v1.3.3 (274e01c7)

      + tscircuit@0.0.931

      289 packages installed [19.99s]
      Dependencies installed successfully.
      Detected GitHub repository
      Installing from github:espressif/kicad-libraries...
      > bun add github:espressif/kicad-libraries
      bun add v1.3.3 (274e01c7)

      installed kicad-libraries@github:espressif/kicad-libraries#93d7c10

      1 package installed [8.38s]

      Converting 47 KiCad footprint(s) to cached modules...
      Cached footprint modules written to node_modules/kicad-libraries/.tsci-cache
      Patched package exports for kicad-libraries to reference cached KiCad modules.
      Generated type declarations for 47 .kicad_mod file(s)
      Type declarations saved to: types/kicad-libraries.d.ts

      Found 47 KiCad footprint(s) in kicad-libraries:

      tsci install cached the footprints locally, so you can import them without a Bun plugin:
      \`\`\`tsx
      import ESP32_C6_WROOM_1U from "kicad-libraries/footprints/Espressif.pretty/ESP32-C6-WROOM-1U.kicad_mod"
      import ESP32_S3_WROOM_2 from "kicad-libraries/footprints/Espressif.pretty/ESP32-S3-WROOM-2.kicad_mod"
      import ESP32_DevKitC from "kicad-libraries/footprints/Espressif.pretty/ESP32-DevKitC.kicad_mod"
      // ... and 44 more

      // Each import is a FootprintSoupElements[] so you can pass it directly:
      <chip footprint={ESP32_C3_DevKitM_1} name="U1" />
      \`\`\`

      ✓ Successfully installed espressif/kicad-libraries
      "
    `)

    // Create tsconfig.json for TypeScript type checking
    await Bun.write(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          jsx: "react-jsx",
          jsxImportSource: "react",
          module: "esnext",
          moduleResolution: "bundler",
          target: "esnext",
          lib: ["esnext"],
          skipLibCheck: true,
        },
      }),
    )

    // Write the circuit file (simulating what customer would write)
    // Users can import .kicad_mod directly because tsci install caches each footprint as ESM
    const circuitCode = `import "tscircuit"
import ESP32_C3_MINI_1 from "kicad-libraries/footprints/Espressif.pretty/ESP32-C3-MINI-1.kicad_mod"

export default () => (
  <board width="30mm" height="30mm">
    <chip footprint={ESP32_C3_MINI_1} name="U1" />
  </board>
)
`
    await Bun.write(join(tmpDir, "index.tsx"), circuitCode)

    // Run TypeScript type checking (simulating: bunx tsc --noEmit)
    const typecheckResult = spawnSync("bunx", ["tsc", "--noEmit"], {
      cwd: tmpDir,
      encoding: "utf-8",
    })
    expect(typecheckResult.stdout + typecheckResult.stderr).not.toContain(
      "error TS",
    )

    // Build the circuit (simulating: tsci build)
    await runCommand("tsci build index.tsx")

    // Check that circuit.json was generated
    const circuitJsonPath = join(tmpDir, "dist", "index", "circuit.json")
    expect(existsSync(circuitJsonPath)).toBe(true)

    const circuitJson = JSON.parse(readFileSync(circuitJsonPath, "utf-8"))
    expect(circuitJson.length).toBeGreaterThan(0)

    // Generate PCB snapshot (simulating: tsci snapshot index.tsx --pcb-only)
    await runCommand("tsci snapshot index.tsx --pcb-only")

    const snapshotPath = join(tmpDir, "__snapshots__", "index-pcb.snap.svg")
    expect(existsSync(snapshotPath)).toBe(true)

    // Copy snapshot to test's __snapshots__ directory for version control
    const testSnapshotsDir = join(__dirname, "__snapshots__")
    const testSnapshotPath = join(testSnapshotsDir, "kicad-library-pcb.svg")
    mkdirSync(testSnapshotsDir, { recursive: true })
    copyFileSync(snapshotPath, testSnapshotPath)

    // Check that the PCB snapshot contains footprint elements
    const snapshotContent = readFileSync(snapshotPath, "utf-8")
    const hasFootprintElements =
      snapshotContent.includes("pcb_smtpad") ||
      snapshotContent.includes("pcb_plated_hole") ||
      snapshotContent.includes("pcb_silkscreen_text") ||
      snapshotContent.includes("pcb_pad")

    expect(hasFootprintElements).toBe(true)

    // Snapshot the PCB to catch regressions
    expect(snapshotContent).toMatchInlineSnapshot(
      `"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" data-software-used-string="@tscircuit/core@0.0.874"><style></style><rect class="boundary" x="0" y="0" fill="#000" width="800" height="600" data-type="pcb_background" data-pcb-layer="global"/><rect class="pcb-boundary" fill="none" stroke="#fff" stroke-width="0.3" x="118.75" y="18.75" width="562.5" height="562.5" data-type="pcb_boundary" data-pcb-layer="global"/><path class="pcb-board" d="M 118.75 581.25 L 681.25 581.25 L 681.25 18.75 L 118.75 18.75 Z" fill="none" stroke="rgba(255, 255, 255, 0.5)" stroke-width="1.875" data-type="pcb_board" data-pcb-layer="board"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="271.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="286.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="301.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="316.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="331.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="346.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="361.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="376.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="391.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="406.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="421.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="306.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="321.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="336.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="351.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="366.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="381.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="396.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="411.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="426.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="441.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="456.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="471.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="486.25" y="435" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="421.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="406.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="391.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="376.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="361.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="346.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="331.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="316.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="301.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="286.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="503.125" y="271.875" width="15" height="7.5" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="486.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="471.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="456.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="441.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="426.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="411.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="396.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="381.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="366.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="351.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="336.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="321.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="306.25" y="251.25" width="7.5" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="355.46875" y="306.09375" width="15" height="15" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="349.375" y="337.03125" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="349.375" y="374.0625" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="386.40625" y="300" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="386.40625" y="337.03125" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="386.40625" y="374.0625" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="423.4375" y="300" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="423.4375" y="337.03125" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="423.4375" y="374.0625" width="27.1875" height="27.1875" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="505" y="251.25" width="13.125" height="13.125" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="505" y="436.875" width="13.125" height="13.125" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="436.875" width="13.125" height="13.125" data-type="pcb_smtpad" data-pcb-layer="top"/><rect class="pcb-pad" fill="rgb(200, 52, 52)" x="281.875" y="251.25" width="13.125" height="13.125" data-type="pcb_smtpad" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 272.5 444.375 L 272.5 459.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_0" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 272.5 459.375 L 287.5 459.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_1" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 276.25 144.375 L 523.75 144.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_2" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 276.25 245.625 L 523.75 245.625" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_3" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 276.25 455.625 L 276.25 144.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_4" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 288.90625 140.625 L 272.96875 140.625" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_5" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 513.4375 140.625 L 527.5 140.625" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_6" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 523.75 144.375 L 523.75 455.625" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_7" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 523.75 455.625 L 276.25 455.625" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_8" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 527.5 140.625 L 527.5 151.875" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_9" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 527.5 444.375 L 527.5 459.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_10" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><path class="pcb-silkscreen pcb-silkscreen-top" d="M 527.5 459.375 L 512.5 459.375" fill="none" stroke="#f2eda1" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" data-pcb-component-id="pcb_component_0" data-pcb-silkscreen-path-id="pcb_silkscreen_path_11" data-type="pcb_silkscreen_path" data-pcb-layer="top"/><text x="0" y="0" dx="0" dy="0" fill="#f2eda1" font-family="Arial, sans-serif" font-size="22.5" text-anchor="middle" dominant-baseline="central" transform="matrix(1,0,0,1,400,121.875)" class="pcb-silkscreen-text pcb-silkscreen-top" data-pcb-silkscreen-text-id="pcb_component_0" stroke="none" data-type="pcb_silkscreen_text" data-pcb-layer="top">U1</text><text x="0" y="0" dx="0" dy="0" fill="#f2eda1" font-family="Arial, sans-serif" font-size="22.5" text-anchor="middle" dominant-baseline="central" transform="matrix(1,0,0,1,400,190.3125)" class="pcb-silkscreen-text pcb-silkscreen-top" data-pcb-silkscreen-text-id="pcb_component_0" stroke="none" data-type="pcb_silkscreen_text" data-pcb-layer="top">U1</text></svg>"`,
    )
  },
  { timeout: 90_000 },
)
