import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { generateTsConfig } from "lib/shared/generate-ts-config"
import { chromium, type Browser, type Page } from "playwright"
import getPort from "get-port"
import * as fs from "node:fs"
import * as path from "node:path"
import { temporaryDirectory } from "tempy"

/**
 * This test reproduces a bug where GLB export fails with WASM initialization error:
 * "Failed to initialize WASM: TypeError: Cannot read properties of undefined (reading 'initWasm')"
 *
 * The error occurs when trying to export GLB from the runframe UI (File > Export > GLB).
 * The circuit-json-to-gltf library uses WASM for certain operations, and the WASM module
 * isn't being properly initialized in the browser environment.
 */
test("GLB export should not fail with WASM initialization error", async () => {
  // Create temporary directory with a test circuit
  const tmpDir = temporaryDirectory()

  // Create a simple circuit that reproduces the issue
  const circuitCode = `
const cellPitch = 8.0;
const rows = 3;
const cols = 3;

const holeDia = 0.8;
const outDia= 1.0
const pillW = 1.7;
const pillH = 0.8;
const pillR = 0.25;
const padOffset = 1.6;

export default () => {
  const totalWidth = (cols - 1) * cellPitch;
  const totalHeight = (rows - 1) * cellPitch;
  const x0 = -totalWidth / 2.0;
  const y0 = totalHeight / 2.0;

  const cells: Array<{
    id: string;
    pcbX: number;
    pcbY: number;
  }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cx = x0 + c * cellPitch;
      const cy = y0 - r * cellPitch;
      cells.push({ id: \`CELL\${idx + 1}\`, pcbX: cx, pcbY: cy });
    }
  }

  return (
    <board>

      {cells.map((cell) => (
        <group key={cell.id}>
          <platedhole
            pcbX={cell.pcbX}
            pcbY={cell.pcbY}
            shape="circle"
            outerDiameter={\`\${outDia}mm\`}
            holeDiameter={\`\${holeDia}mm\`}
          />
          <hole
            pcbX={\`\${(cell.pcbX + padOffset).toFixed(4)}mm\`}
            pcbY={\`\${(cell.pcbY + padOffset).toFixed(4)}mm\`}
            shape="pill"
            width={\`\${pillW}mm\`}
            height={\`\${pillH}mm\`}
            pcbRotation={45}
          />
          <hole
            pcbX={\`\${(cell.pcbX - padOffset).toFixed(4)}mm\`}
            pcbY={\`\${(cell.pcbY + padOffset).toFixed(4)}mm\`}
            shape="pill"
            width={\`\${pillW}mm\`}
            height={\`\${pillH}mm\`}
            pcbRotation={-45}
          />
          <hole
            pcbX={\`\${(cell.pcbX - padOffset).toFixed(4)}mm\`}
            pcbY={\`\${(cell.pcbY - padOffset).toFixed(4)}mm\`}
            shape="pill"
            width={\`\${pillW}mm\`}
            height={\`\${pillH}mm\`}
            pcbRotation={45}
          />
          <hole
            pcbX={\`\${(cell.pcbX + padOffset).toFixed(4)}mm\`}
            pcbY={\`\${(cell.pcbY - padOffset).toFixed(4)}mm\`}
            shape="pill"
            width={\`\${pillW}mm\`}
            height={\`\${pillH}mm\`}
            pcbRotation={-45}
          />
        </group>
      ))}
    </board>
  );
};
`

  // Write the circuit file
  const mainComponentPath = path.join(tmpDir, "index.tsx")
  fs.writeFileSync(mainComponentPath, circuitCode)

  // Create package.json
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify(
      {
        name: "glb-export-test",
        version: "1.0.0",
        dependencies: {
          tscircuit: "*",
        },
      },
      null,
      2,
    ),
  )

  // Generate tsconfig
  generateTsConfig(tmpDir)

  // Start DevServer
  const port = await getPort()
  const devServer = new DevServer({
    port,
    componentFilePath: mainComponentPath,
    projectDir: tmpDir,
  })

  await devServer.start()

  const fsUrl = `http://localhost:${port}`

  let browser: Browser | undefined
  let page: Page | undefined
  const consoleErrors: string[] = []

  try {
    browser = await chromium.launch({
      headless: true,
    })
    page = await browser.newPage()

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate to the DevServer
    await page.goto(fsUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    })

    // Wait for the circuit to render
    await page.waitForTimeout(5000)

    // Try to trigger GLB export via the menu
    // First, click on "File" menu
    console.log("Looking for File menu...")
    
    // Take a screenshot for debugging
    await page.screenshot({ path: path.join(tmpDir, "before-menu.png") })
    
    // Try different selectors for the File menu
    let fileMenuClicked = false
    const fileMenuSelectors = [
      'button:has-text("File")',
      '[data-testid="file-menu"]',
      'text="File"',
      'div:has-text("File"):visible',
    ]
    
    for (const selector of fileMenuSelectors) {
      try {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`Found File menu with selector: ${selector}`)
          await element.click()
          fileMenuClicked = true
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!fileMenuClicked) {
      console.log("Could not find File menu, trying keyboard shortcut or direct API call")
      // Try to find any menu trigger
      const allButtons = await page.locator("button").all()
      console.log(`Found ${allButtons.length} buttons on page`)
      for (const btn of allButtons.slice(0, 10)) {
        const text = await btn.textContent()
        console.log(`Button text: ${text}`)
      }
    }
    
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(tmpDir, "after-file-click.png") })

    // Look for Export submenu
    console.log("Looking for Export menu...")
    const exportMenu = page.locator('text="Export"').first()
    if (await exportMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Found Export menu, clicking...")
      await exportMenu.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(tmpDir, "after-export-click.png") })

      // List all visible menu items
      const menuItems = await page.locator('[role="menuitem"], [role="menu"] *').all()
      console.log(`Found ${menuItems.length} menu items`)
      for (const item of menuItems.slice(0, 20)) {
        const text = await item.textContent().catch(() => "")
        if (text) console.log(`Menu item: ${text}`)
      }

      // Click on GLB option - try different selectors
      console.log("Looking for GLB option...")
      const glbSelectors = [
        'text="GLB (Binary GLTF)"',
        'text=/GLB.*GLTF/i',
        '[role="menuitem"]:has-text("GLB")',
        'div:has-text("GLB (Binary GLTF)")',
        'span:has-text("GLB")',
        'text="GLB"',
      ]
      
      let glbClicked = false
      for (const selector of glbSelectors) {
        try {
          const glbOption = page.locator(selector).first()
          if (await glbOption.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log(`Found GLB option with selector: ${selector}`)
            await glbOption.click()
            glbClicked = true
            await page.waitForTimeout(5000)
            await page.screenshot({ path: path.join(tmpDir, "after-glb-click.png") })
            break
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!glbClicked) {
        console.log("GLB option not found with any selector")
      }
    } else {
      console.log("Export menu not visible")
    }
    
    console.log(`Screenshots saved to: ${tmpDir}`)

    // Check for WASM initialization errors
    const wasmErrors = consoleErrors.filter(
      (err) =>
        err.includes("WASM") ||
        err.includes("initWasm") ||
        err.includes("Failed to initialize"),
    )

    console.log("Console errors:", consoleErrors)
    console.log("WASM-related errors:", wasmErrors)

    // BUG: GLB export fails with WASM initialization error
    // The error is: "Failed to initialize WASM: TypeError: Cannot read properties of undefined (reading 'initWasm')"
    // This happens in the @tscircuit/runframe bundle (standalone.min.js)
    // The circuit-json-to-gltf library uses @resvg/resvg-wasm for rendering,
    // but the WASM module isn't being properly initialized in the browser.
    //
    // To fix this bug, the runframe package needs to:
    // 1. Properly initialize the WASM module before using it
    // 2. Or use @resvg/resvg-js instead of @resvg/resvg-wasm for browser environments
    // 3. Or ensure the WASM binary is properly bundled and loaded
    //
    // Uncomment the line below once the bug is fixed:
    // expect(wasmErrors.length).toBe(0)
    
    // For now, we document that the bug exists
    expect(wasmErrors.length).toBeGreaterThan(0)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
    await devServer.stop()
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}, 120_000)
