import { expect, spyOn, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { AutorouterDiagnostics } from "lib/shared/autorouter-diagnostics"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

// A synthetic project-local runtime exercises the actual CLI import/render
// boundary without installing an older tscircuit package or mocking modules.
// It models the legacy public API, not a complete circuit implementation.
const runtimeSource = `
import { EventEmitter } from "node:events"
export const config = { modern: false, ownRender: false, renderError: undefined }
export const state = { runner: undefined, originalDescriptor: undefined, legacyCalls: 0 }
export class RootCircuit extends EventEmitter {
  children = []
  renders = 0
  completions = 0
  records = []
  constructor() {
    super()
    state.runner = this
    if (config.ownRender) {
      Object.defineProperty(this, "render", {
        value: this.render, writable: true, enumerable: false, configurable: true,
      })
    }
    state.originalDescriptor = Object.getOwnPropertyDescriptor(this, "render")
    this.on("renderComplete", () => { this.completions++ })
    if (config.modern) {
      this.isDoneRendering = () => this.renders >= 3
      this.getRunningAsyncEffects = () => [
        { effectName: "fixture-work" }, { effectName: "fixture-work" },
      ]
    }
  }
  add() { this.children.push({ getDescendants: () => [] }) }
  render() {
    this.renders++
    if (config.renderError) throw config.renderError
    if (this.renders === 1) {
      this.emit("asyncEffect:start", { effectName: "fixture-work" })
      this.emit("asyncEffect:start", { effectName: "fixture-work" })
    }
  }
  async renderUntilSettled() {
    state.legacyCalls++
    if (config.modern) throw new Error("modern runtime must use the polling API")
    this.records.push({ type: "source_project_metadata", software_used_string: "synthetic-legacy" })
    this.render()
    while (this.renders < 3) {
      await new Promise((resolve) => setTimeout(resolve, 20))
      this.render()
    }
    this.emit("renderComplete")
  }
  getCircuitJson() { return this.records }
}
`

const fixture = async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-legacy-render-"))
  try {
    const packageDir = path.join(dir, "node_modules", "tscircuit")
    fs.mkdirSync(packageDir, { recursive: true })
    fs.writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({
        name: "tscircuit",
        type: "module",
        exports: "./index.mjs",
      }),
    )
    const runtimePath = path.join(packageDir, "index.mjs")
    fs.writeFileSync(runtimePath, runtimeSource)
    const filePath = path.join(dir, "board.js")
    fs.writeFileSync(
      filePath,
      "export default function Board() { return null }\n",
    )
    const runtime = await import(pathToFileURL(runtimePath).href)
    return {
      runtime,
      run: (onAsyncEffectStatus?: (name: string) => void) =>
        generateCircuitJson({
          filePath,
          projectDir: dir,
          onAsyncEffectStatus,
          sourceFilesystemMd5Hash: "00000000000000000000000000000000",
        }),
      cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

test("project-local legacy runtime settles and reports completion and progress once", async () => {
  const f = await fixture()
  try {
    const statuses: string[] = []
    const result = await f.run((name) => statuses.push(name))
    const runner = f.runtime.state.runner
    expect(runner.renders).toBe(3)
    expect(runner.completions).toBe(1)
    expect(f.runtime.state.legacyCalls).toBe(1)
    expect(statuses).toEqual(["fixture-work"])
    expect(runner.listenerCount("asyncEffect:start")).toBe(0)
    expect(Object.getOwnPropertyDescriptor(runner, "render")).toBeUndefined()
    expect(runner.render).toBe(f.runtime.RootCircuit.prototype.render)
    expect(result.circuitJson).toEqual([
      {
        type: "source_project_metadata",
        software_used_string: "synthetic-legacy",
        source_filesystem_md5_hash: "00000000000000000000000000000000",
      },
    ])
  } finally {
    f.cleanup()
  }
})

test("legacy render errors propagate and restore an existing render descriptor", async () => {
  const f = await fixture()
  const error = new Error("legacy render failed")
  f.runtime.config.ownRender = true
  f.runtime.config.renderError = error
  try {
    await expect(f.run()).rejects.toBe(error)
    const runner = f.runtime.state.runner
    expect(runner.completions).toBe(0)
    expect(runner.listenerCount("asyncEffect:start")).toBe(0)
    expect(Object.getOwnPropertyDescriptor(runner, "render")).toEqual(
      f.runtime.state.originalDescriptor,
    )
  } finally {
    f.cleanup()
  }
})

test("legacy diagnostic failures stop rendering and clean up temporary hooks", async () => {
  const f = await fixture()
  const error = new Error("autorouter timeout")
  const checkTimeout = spyOn(
    AutorouterDiagnostics.prototype,
    "checkTimeout",
  ).mockImplementation(() => {
    if (f.runtime.state.runner.renders >= 2) throw error
  })
  try {
    await expect(f.run()).rejects.toBe(error)
    const runner = f.runtime.state.runner
    expect(runner.renders).toBe(2)
    expect(runner.completions).toBe(0)
    expect(runner.listenerCount("asyncEffect:start")).toBe(0)
    expect(Object.getOwnPropertyDescriptor(runner, "render")).toBeUndefined()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(runner.renders).toBe(2)
  } finally {
    checkTimeout.mockRestore()
    f.cleanup()
  }
})

test("modern project-local runtime retains the polling path", async () => {
  const f = await fixture()
  f.runtime.config.modern = true
  try {
    const statuses: string[] = []
    await f.run((name) => statuses.push(name))
    expect(f.runtime.state.legacyCalls).toBe(0)
    expect(f.runtime.state.runner.renders).toBe(3)
    expect(f.runtime.state.runner.completions).toBe(1)
    expect(statuses).toEqual(["fixture-work"])
  } finally {
    f.cleanup()
  }
})
