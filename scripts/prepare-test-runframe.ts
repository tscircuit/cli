import fs from "node:fs"
import path from "node:path"

const [sourceDirectory, outputPath] = process.argv.slice(2)
if (!sourceDirectory || !outputPath) {
  throw new Error("Usage: prepare-test-runframe.ts <runframe-source> <output>")
}

const standalone = fs.readFileSync(
  path.join(sourceDirectory, "dist/standalone.min.js"),
  "utf8",
)
const worker = fs.readFileSync(
  path.join(
    sourceDirectory,
    "node_modules/@tscircuit/eval/dist/webworker/entrypoint.js",
  ),
)
const placeholder = JSON.stringify(
  "<--INJECT_TSCIRCUIT_EVAL_WEB_WORKER_BLOB_URL-->",
)
if (!standalone.includes(placeholder)) {
  throw new Error("RunFrame evaluator worker placeholder was not found")
}
const workerUrl = `URL.createObjectURL(new Blob([atob(${JSON.stringify(worker.toString("base64"))})], { type: "application/javascript" }))`
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, standalone.replace(placeholder, workerUrl))
