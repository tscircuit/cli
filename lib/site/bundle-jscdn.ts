import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { isBuiltin } from "node:module"
import path from "node:path"
import {
  getImportUrls,
  supportedModules,
} from "@tscircuit/internal-dynamic-import"
import ts from "typescript"

const jscdnOrigin = "https://jscdn.tscircuit.com"

const splitSpecifier = (specifier: string) => {
  const separator = specifier.lastIndexOf("@")
  return separator > 0
    ? {
        name: specifier.slice(0, separator),
        version: specifier.slice(separator + 1),
      }
    : { name: specifier, version: "latest" }
}

export const getRunframeDynamicImports = (source: string): string[] => {
  const supported = new Set<string>(supportedModules)
  const specifiers = new Set<string>()
  const sourceFile = ts.createSourceFile(
    "runframe.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const argument = node.arguments[0]
      if (
        argument &&
        ts.isStringLiteralLike(argument) &&
        supported.has(splitSpecifier(argument.text).name)
      ) {
        specifiers.add(argument.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return [...specifiers].sort()
}

export const getJscdnImportMap = (
  specifiers: string[],
  baseUrl: string,
  bundled = false,
) => {
  const imports: Record<string, string> = {}
  const base = baseUrl.replace(/\/+$/, "")
  // Import-map addresses must be URLs or start with /, ./ or ../.
  const prefix = /^(?:[a-z][a-z\d+.-]*:|\/|\.\.?\/)/i.test(baseUrl)
    ? base
    : `./${base}`
  for (const specifier of specifiers) {
    const { name, version } = splitSpecifier(specifier)
    const [importUrl] = getImportUrls(specifier)
    const entrypoint = new URL(importUrl).pathname
      .split("/")
      .slice(name.split("/").length + 2)
      .join("/")
    const localUrl = `${prefix}/${name}/${version}/${entrypoint}${bundled ? ".js" : ""}`
    for (const url of getImportUrls(specifier)) imports[url] = localUrl
    // Also handle importers that honor TSCIRCUIT_JSCDN_BASE_URL themselves.
    if (bundled)
      imports[`${prefix}/${name}/${version}/${entrypoint}`] = localUrl
  }
  return { imports }
}

const getFallbackUrls = (url: string) => {
  const parsed = new URL(url)
  if (parsed.origin !== jscdnOrigin) return [url]
  const segments = parsed.pathname.split("/").slice(1)
  const first = segments.shift()!
  const name = first.startsWith("@") ? `${first}/${segments.shift()}` : first
  const version = segments.shift()
  const file = segments.join("/")
  const specifier = `${name}${version === "latest" ? "" : `@${version}`}`
  return [
    url,
    `https://cdn.jsdelivr.net/npm/${specifier}/${file}`,
    `https://esm.run/${specifier}${file === "+esm" ? "" : `/${file}`}`,
  ]
}

const fetchModule = async (url: string) => {
  const errors: string[] = []
  for (const candidate of getFallbackUrls(url)) {
    try {
      const response = await fetch(candidate, {
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      // The CDN's simple CommonJS wrappers expose only a default export.
      // Prefer its browser-bundler fallback so named imports keep working.
      if (
        new URL(candidate).origin === jscdnOrigin &&
        new URL(candidate).pathname.endsWith("/+esm") &&
        /\bconst __cjsModule\s*=/.test(await response.clone().text())
      ) {
        throw new Error("CDN returned a default-only CommonJS wrapper")
      }
      return response
    } catch (error) {
      errors.push(
        `${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  throw new Error(`Failed to bundle JS CDN module ${url}\n${errors.join("\n")}`)
}

type ModuleJob = { url: string; filePath: string; asset: boolean }

/** Mirror the browser ESM graph, preserving lazy imports and shared dependencies. */
export const bundleJscdn = async ({
  outputDir,
  specifiers,
}: {
  outputDir: string
  specifiers: string[]
}) => {
  const jobs: ModuleJob[] = []
  const files = new Map<string, string>()
  const enqueue = (url: string, asset = false, entryPath?: string) => {
    const existing = files.get(url)
    if (existing) return existing
    const hash = createHash("sha256").update(url).digest("hex")
    const extension = asset ? path.posix.extname(new URL(url).pathname) : ".js"
    const filePath = entryPath ?? `_modules/${hash}${extension}`
    files.set(url, filePath)
    jobs.push({ url, filePath, asset })
    return filePath
  }

  for (const specifier of specifiers) {
    const [url] = getImportUrls(specifier)
    enqueue(url, false, `${new URL(url).pathname.slice(1)}.js`)
  }

  const saveModule = async ({ url, filePath, asset }: ModuleJob) => {
    const response = await fetchModule(url)
    const destination = path.join(outputDir, filePath)
    await mkdir(path.dirname(destination), { recursive: true })
    if (asset) {
      await writeFile(destination, new Uint8Array(await response.arrayBuffer()))
      return
    }

    const source = await response.text()
    const sourceFile = ts.createSourceFile(
      url,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    )
    const replacements: Array<{ start: number; end: number; text: string }> = []
    const resolveUrl = (specifier: string) =>
      /^(?:https?:|\/|\.\.?\/)/.test(specifier)
        ? new URL(specifier, response.url || url).href
        : `${jscdnOrigin}/${splitSpecifier(specifier).name}/${splitSpecifier(specifier).version}/+esm`
    const rewrite = (
      literal: ts.StringLiteralLike,
      isAsset = false,
      isUrl = false,
    ) => {
      const specifier = literal.text
      if (specifier.startsWith("data:") || specifier.startsWith("blob:")) return
      const dependencyUrl = isUrl
        ? new URL(specifier, response.url || url).href
        : resolveUrl(specifier)
      const dependencyPath = enqueue(dependencyUrl, isAsset)
      let relative = path.posix.relative(
        path.posix.dirname(filePath),
        dependencyPath,
      )
      if (!relative.startsWith(".")) relative = `./${relative}`
      replacements.push({
        start: literal.getStart(sourceFile),
        end: literal.end,
        text: JSON.stringify(relative),
      })
    }
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        rewrite(node.moduleSpecifier)
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text
        // Universal/WASM bundles contain Node-only dynamic imports. These are
        // builtins, not browser packages, and must never be fetched from a CDN.
        const resolved = new URL(resolveUrl(specifier))
        const builtin = resolved.pathname
          .replace(/^\/(?:npm\/)?/, "")
          .split("/")[0]
        if (!isBuiltin(specifier) && !isBuiltin(builtin))
          rewrite(node.arguments[0])
      } else if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "URL" &&
        node.arguments?.length === 2 &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        node.arguments[1].getText(sourceFile) === "import.meta.url"
      ) {
        const filename = node.arguments[0].text
        if (filename !== "." && !filename.endsWith("/")) {
          rewrite(
            node.arguments[0],
            !/\.(?:m?js)(?:[?#]|$)/.test(filename),
            true,
          )
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    let rewritten = source
    for (const { start, end, text } of replacements.sort(
      (a, b) => b.start - a.start,
    )) {
      rewritten = rewritten.slice(0, start) + text + rewritten.slice(end)
    }
    await writeFile(destination, rewritten)
  }

  while (jobs.length > 0) {
    await Promise.all(jobs.splice(0, 4).map(saveModule))
  }
}
