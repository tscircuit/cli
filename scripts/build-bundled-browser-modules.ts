import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import {
  BUNDLED_BROWSER_MODULE_NAMES,
  type BundledBrowserModuleManifest,
} from "../lib/shared/bundled-browser-modules"

const require = createRequire(import.meta.url)
const wasmBytesSource = (file: string) =>
  `Uint8Array.from(atob(${JSON.stringify(fs.readFileSync(file).toString("base64"))}), char => char.charCodeAt(0))`

/** Embed WASM and choose the browser rasterizer before bundling dependency graphs. */
const browserRuntimePlugin: Bun.BunPlugin = {
  name: "self-contained-browser-runtime",
  setup(build) {
    // Emscripten also publishes Node initialization branches. Select browser
    // mode at build time so native module imports cannot escape the bundle.
    build.onLoad(
      {
        filter:
          /(?:manifold-3d[\\/]manifold|occt-import-js[\\/]dist[\\/]occt-import-js)\.js$/,
      },
      (args) => ({
        contents: fs
          .readFileSync(args.path, "utf8")
          .replace(/var ENVIRONMENT_IS_NODE=[^;]+;/, "")
          .replace(/\bENVIRONMENT_IS_NODE\b/g, "false"),
        loader: "js",
      }),
    )
    build.onResolve(
      { filter: /.*/, namespace: "inline-wasm-loader" },
      (args) => ({
        path: args.path,
        namespace: "file",
      }),
    )
    // The published LightBurn converter hides its import behind a variable and
    // a CDN fallback. Resolve both branches to the installed browser module.
    build.onLoad(
      { filter: /circuit-json-to-lbrn[\\/]dist[\\/]index\.js$/ },
      (args) => ({
        contents: fs
          .readFileSync(args.path, "utf8")
          .replace(
            /import\(\s*\/\* @vite-ignore \*\/\s*(?:moduleName|cdnUrl)\s*\)/g,
            'import("manifold-3d")',
          ),
        loader: "js",
      }),
    )
    build.onResolve({ filter: /svg-to-png(?:-browser)?-[\w]+\.js$/ }, () => ({
      path: fileURLToPath(
        new URL("./browser-runtime/svg-to-png.ts", import.meta.url),
      ),
    }))
    build.onResolve({ filter: /\.wasm\?(?:url|inline-bytes)$/ }, (args) => ({
      path: require.resolve(args.path.split("?")[0]),
      namespace: args.path.endsWith("?url")
        ? "inline-wasm-url"
        : "inline-wasm-bytes",
    }))
    build.onLoad({ filter: /.*/, namespace: "inline-wasm-url" }, (args) => ({
      contents: `export default ${JSON.stringify(`data:application/wasm;base64,${fs.readFileSync(args.path).toString("base64")}`)}`,
      loader: "js",
    }))
    build.onLoad({ filter: /.*/, namespace: "inline-wasm-bytes" }, (args) => ({
      contents: `export default ${wasmBytesSource(args.path)}`,
      loader: "js",
    }))
    build.onResolve({ filter: /^(?:occt-import-js|manifold-3d)$/ }, (args) => ({
      path: `${Bun.resolveSync(args.path, args.resolveDir)}?cli-inline-wasm-loader`,
      namespace: "inline-wasm-loader",
    }))
    build.onLoad({ filter: /.*/, namespace: "inline-wasm-loader" }, (args) => {
      const entry = args.path.split("?")[0]
      const wasm = entry.includes("manifold-3d")
        ? path.join(path.dirname(entry), "manifold.wasm")
        : path.join(path.dirname(entry), "occt-import-js.wasm")
      return {
        contents: `import createModule from ${JSON.stringify(entry)};
          export default (options = {}) => createModule({ ...options, locateFile: file => file, wasmBinary: ${wasmBytesSource(wasm)} });`,
        loader: "js",
      }
    })
  },
}

export const buildBundledBrowserModules = async (outdir = "./dist/jscdn") => {
  const manifest = {} as BundledBrowserModuleManifest
  const transpiler = new Bun.Transpiler({ loader: "js" })
  for (const name of BUNDLED_BROWSER_MODULE_NAMES) {
    const entry = require.resolve(name)
    let directory = path.dirname(entry)
    while (!fs.existsSync(path.join(directory, "package.json"))) {
      directory = path.dirname(directory)
    }
    const { version } = JSON.parse(
      fs.readFileSync(path.join(directory, "package.json"), "utf8"),
    )
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "esm",
      env: "disable",
      minify: true,
      splitting: false,
      define: { "globalThis.process": "undefined" },
      plugins: [browserRuntimePlugin],
    })
    if (!result.success || result.outputs.length !== 1) {
      throw new Error(`Could not bundle ${name}: ${result.logs.join("\n")}`)
    }
    const content = await result.outputs[0].text()
    const imports = transpiler.scanImports(content)
    let hasDynamicImports = false
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        hasDynamicImports = true
      ts.forEachChild(node, visit)
    }
    visit(
      ts.createSourceFile(
        "bundle.js",
        content,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.JS,
      ),
    )
    if (imports.length || hasDynamicImports) {
      throw new Error(
        `${name} bundle has external imports: ${imports.map((item) => item.path).join(", ")}`,
      )
    }
    for (const alias of ["latest", version]) {
      const directory = path.join(outdir, name, alias)
      fs.mkdirSync(directory, { recursive: true })
      fs.writeFileSync(path.join(directory, "+esm"), content)
    }
    manifest[name] = { version }
    console.log(
      `Bundled ${name}@${version} (${(content.length / 1024 / 1024).toFixed(2)} MB)`,
    )
  }
  fs.writeFileSync(
    path.join(outdir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  )
}

if (import.meta.main) await buildBundledBrowserModules()
