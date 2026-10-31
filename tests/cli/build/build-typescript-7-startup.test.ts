import { expect, mock, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"

test("cli/build/transpile/index does not eagerly import @rollup/plugin-typescript or typescript at module load", async () => {
  const sourcePath = path.resolve(
    import.meta.dir,
    "../../../cli/build/transpile/index.ts",
  )
  const source = fs.readFileSync(sourcePath, "utf-8")

  expect(source).not.toMatch(
    /^import\s+.*from\s+["']@rollup\/plugin-typescript["']/m,
  )
  expect(source).not.toMatch(/^import\s+.*from\s+["']typescript["']/m)
})

test("transpileFile reports actionable error when TypeScript 7 lacks JS compiler API (ModuleKind)", async () => {
  mock.module("typescript", () => ({
    default: {},
  }))

  const { transpileFile } = await import(
    "../../../cli/build/transpile/index.ts"
  )

  const errors: string[] = []
  const origConsoleError = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "))
  }

  try {
    const ok = await transpileFile({
      input: "index.tsx",
      outputDir: "dist",
      projectDir: process.cwd(),
    })
    expect(ok).toBe(false)
    expect(errors.join("\n")).toContain(
      "TypeScript transpilation requires the TypeScript JavaScript compiler API",
    )
  } finally {
    console.error = origConsoleError
    mock.restore()
  }
})
