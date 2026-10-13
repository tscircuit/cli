import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium, type Browser } from "playwright"
import { buildBundledBrowserModules } from "../../scripts/build-bundled-browser-modules"
import { BUNDLED_BROWSER_MODULE_NAMES } from "../../lib/shared/bundled-browser-modules"

test("native browser converter imports run real WASM without external requests", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "tsci-browser-bundles-"))
  let browser: Browser | undefined
  let server: ReturnType<typeof Bun.serve> | undefined
  const externalRequests: string[] = []
  const browserErrors: string[] = []
  const assetRequests: string[] = []
  let stepModel = ""
  try {
    // Build fresh artifacts so this test also verifies the packaging adapters.
    await buildBundledBrowserModules(directory)
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        const url = new URL(request.url)
        assetRequests.push(url.pathname)
        if (url.pathname === "/") {
          return new Response("<!doctype html><html><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          })
        }
        if (url.pathname === "/model.step") {
          return new Response(stepModel, {
            headers: { "Content-Type": "application/step" },
          })
        }
        if (!url.pathname.startsWith("/jscdn/"))
          return new Response("Missing", { status: 404 })
        const moduleFile = path.join(
          directory,
          url.pathname.slice("/jscdn/".length),
        )
        return new Response(Bun.file(moduleFile), {
          headers: { "Content-Type": "text/javascript" },
        })
      },
    })
    const origin = `http://127.0.0.1:${server.port}`
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    })
    const context = await browser.newContext({ serviceWorkers: "block" })
    await context.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin) {
        await route.continue()
      } else {
        externalRequests.push(route.request().url())
        await route.abort()
      }
    })
    const page = await context.newPage()
    page.on("pageerror", (error) => browserErrors.push(error.message))
    page.on("console", (message) => {
      // Several converters catch loader failures and otherwise return output.
      if (message.type() === "error" || message.type() === "warning") {
        browserErrors.push(message.text())
      }
    })
    await page.goto(origin)
    await page.evaluate(() => {
      const modules = new Map<string, Promise<any>>()
      ;(window as any).loadBundle = (name: string) => {
        if (!modules.has(name)) {
          modules.set(
            name,
            (async () => {
              return import(`/jscdn/${name}/latest/+esm`)
            })(),
          )
        }
        return modules.get(name)!
      }
    })
    const loadedModules = await page.evaluate(
      async (names) => {
        const results = []
        for (const name of names) {
          const module = await (window as any).loadBundle(name)
          results.push({ name, exports: Object.keys(module) })
        }
        return results
      },
      [...BUNDLED_BROWSER_MODULE_NAMES],
    )
    expect(loadedModules).toHaveLength(BUNDLED_BROWSER_MODULE_NAMES.length)
    for (const module of loadedModules)
      expect(module.exports.length).toBeGreaterThan(0)

    const board = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/export/output-path-board.circuit.json",
          import.meta.url,
        ),
        "utf8",
      ),
    )
    stepModel = await page.evaluate(async (board) => {
      const module = await (window as any).loadBundle("circuit-json-to-step")
      return module.circuitJsonToStep(board, { exportMode: "pcb" })
    }, board)
    expect(stepModel).toContain("ISO-10303-21")
    expect(stepModel).toContain("MANIFOLD_SOLID_BREP")

    const gltfResult = await page.evaluate(
      async ({ board, modelUrl }) => {
        const module = await (window as any).loadBundle("circuit-json-to-gltf")
        const circuit = [
          ...board,
          {
            type: "source_component",
            source_component_id: "source_component_1",
            name: "R1",
            ftype: "simple_resistor",
            resistance: 1000,
          },
          {
            type: "pcb_component",
            pcb_component_id: "pcb_component_1",
            source_component_id: "source_component_1",
            center: { x: 0, y: 0 },
            width: 2,
            height: 1,
            layer: "top",
            rotation: 0,
          },
          {
            type: "cad_component",
            cad_component_id: "cad_component_1",
            pcb_component_id: "pcb_component_1",
            source_component_id: "source_component_1",
            model_step_url: modelUrl,
            position: { x: 0, y: 0, z: 1.6 },
            rotation: { x: 0, y: 0, z: 0 },
            size: { x: 10, y: 10, z: 1.6 },
          },
          {
            type: "pcb_silkscreen_text",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
            pcb_component_id: "pcb_component_1",
            text: "R1",
            layer: "top",
            anchor_position: { x: 0, y: 3 },
            anchor_alignment: "center",
            font_size: 1,
            ccw_rotation: 0,
          },
        ]
        // Verify both rasterization and OCCT mesh loading, including failures that
        // the higher-level GLB converter would otherwise silently catch.
        const textures = await module.renderBoardTextures(circuit, {
          resolution: 64,
        })
        const png = Uint8Array.from(atob(textures.top.split(",")[1]), (char) =>
          char.charCodeAt(0),
        )
        const scene = await module.convertCircuitJsonTo3D(circuit, {
          renderBoardTextures: false,
        })
        const model = scene.boxes.find((box: any) => box.label === "R1")
        const glb = await module.convertCircuitJsonToGltf(circuit, {
          format: "glb",
          boardTextureResolution: 64,
        })
        return {
          pngHeader: Array.from(png.slice(0, 8)),
          triangles: model?.mesh?.triangles?.length ?? 0,
          glbHeader: Array.from(new Uint8Array(glb).slice(0, 4)),
          glbLength: glb.byteLength,
        }
      },
      { board, modelUrl: `${origin}/model.step` },
    )
    expect(gltfResult.pngHeader).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(gltfResult.triangles).toBeGreaterThan(0)
    expect(gltfResult.glbHeader).toEqual([103, 108, 84, 70])
    expect(gltfResult.glbLength).toBeGreaterThan(100)
    expect(assetRequests).toContain("/model.step")

    const boxResult = await page.evaluate(async () => {
      const module = await (window as any).loadBundle(
        "circuit-json-to-fdm-component-box",
      )
      const components = [
        {
          type: "source_component",
          source_component_id: "source_component_1",
          name: "R1",
          ftype: "simple_resistor",
          resistance: 1000,
        },
      ]
      const box = await module.createFdmComponentBox(components)
      const png = await module.renderFdmComponentBoxPng(
        components,
        {},
        {
          width: 64,
          height: 48,
        },
      )
      return {
        zipHeader: Array.from(box.threeMf.slice(0, 4)),
        triangles: box.meshStats.totalTriangles,
        refdes: box.componentRefdes,
        pngHeader: Array.from(png.slice(0, 8)),
      }
    })
    expect(boxResult.zipHeader).toEqual([80, 75, 3, 4])
    expect(boxResult.triangles).toBeGreaterThan(0)
    expect(boxResult.refdes).toEqual(["R1"])
    expect(boxResult.pngHeader).toEqual([137, 80, 78, 71, 13, 10, 26, 10])

    const lbrnResult = await page.evaluate(async (board) => {
      const module = await (window as any).loadBundle("circuit-json-to-lbrn")
      const project = await module.convertCircuitJsonToLbrn(
        [
          ...board,
          {
            type: "pcb_smtpad",
            pcb_smtpad_id: "pcb_smtpad_1",
            pcb_component_id: "pcb_component_1",
            shape: "rect",
            layer: "top",
            x: 0,
            y: 0,
            width: 2,
            height: 1,
          },
        ],
        {
          includeCopper: false,
          includeSoldermask: true,
          includeSoldermaskCure: true,
          includeLayers: ["top"],
        },
      )
      const shapes: any[] = []
      const collect = (element: any) => {
        if (element.cutIndex === 10 && element.verts?.length)
          shapes.push(element)
        for (const child of element.getChildren?.() ?? []) collect(child)
      }
      collect(project)
      return { xml: project.toXml(), cureShapes: shapes.length }
    }, board)
    expect(lbrnResult.xml).toContain("LightBurnProject")
    // Manifold computes the board minus its soldermask openings on cut layer 10.
    expect(lbrnResult.cureShapes).toBeGreaterThan(0)
    expect(externalRequests).toEqual([])
    expect(browserErrors).toEqual([])
  } finally {
    await browser?.close()
    server?.stop(true)
    rmSync(directory, { recursive: true, force: true })
  }
}, 120_000)
