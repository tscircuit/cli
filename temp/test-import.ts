import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"

// Simulate importFromUserLand
const userModulePath = path.join(process.cwd(), "node_modules", "tscircuit")
console.log("cwd:", process.cwd())
console.log("userModulePath exists:", fs.existsSync(userModulePath))

const userRequire = createRequire(path.join(process.cwd(), "noop.js"))
const resolvedUserPath = userRequire.resolve("tscircuit")
console.log("Resolved tscircuit to:", resolvedUserPath)

const mod = await import(resolvedUserPath)
console.log("SUCCESS: tscircuit loaded")

const React = await import(userRequire.resolve("react"))
;(globalThis as any).React = React

const runner = new mod.RootCircuit()
runner.add(
  React.createElement(
    "board",
    null,
    React.createElement("resistor", {
      resistance: "1k",
      footprint: "0402",
      name: "R1",
    }),
  ),
)
console.log("Rendering...")
await runner.renderUntilSettled()
console.log("SUCCESS: Circuit rendered")
