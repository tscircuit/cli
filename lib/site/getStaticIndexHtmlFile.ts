import { loadingStateUi } from "./loadingStateUi"
import type { TscircuitProjectConfig } from "lib/project-config/project-config-schema"
import { serializeScriptValue } from "./serialize-script-value"

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
  embeddedCircuitJson?: unknown[]
  defaultMainComponentPath?: string
  packageName?: string
  jscdnBaseUrl?: string
  extraRunFrameTabs?: TscircuitProjectConfig["extraRunFrameTabs"]
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc = "./standalone.min.js",
  embeddedCircuitJson,
  defaultMainComponentPath,
  packageName,
  jscdnBaseUrl,
  extraRunFrameTabs = [],
}: GetStaticIndexHtmlFileOptions) => {
  if (embeddedCircuitJson !== undefined && files.length !== 1) {
    throw new Error("Embedding Circuit JSON requires exactly one circuit file")
  }
  const scriptLines = [
    "window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;",
    `window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = ${serializeScriptValue(extraRunFrameTabs)};`,
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${serializeScriptValue(files)};`,
    ...(embeddedCircuitJson !== undefined
      ? [
          `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST[0].fileStaticAssetUrl = URL.createObjectURL(new Blob([JSON.stringify(${serializeScriptValue(embeddedCircuitJson)})], { type: "application/json" }));`,
        ]
      : []),
    ...(jscdnBaseUrl !== undefined
      ? [
          `window.TSCIRCUIT_JSCDN_BASE_URL = ${JSON.stringify(jscdnBaseUrl).replace(/</g, "\\u003c")};`,
        ]
      : []),
    ...(defaultMainComponentPath
      ? [
          `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = ${serializeScriptValue(defaultMainComponentPath)};`,
        ]
      : []),
    ...(packageName
      ? [
          `window.TSCIRCUIT_PACKAGE_NAME = ${serializeScriptValue(packageName)};`,
        ]
      : []),
  ]

  const scriptBlock = `      <script>\n        ${scriptLines.join("\n        ")}\n      </script>\n`

  return `<html>
    <head>
      <link rel="icon" type="image/png" href="https://github.com/tscircuit.png">
      <meta charset="UTF-8" />
      <title>${escapeHtml(packageName || "tscircuit")}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
${scriptBlock}      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">${loadingStateUi}</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script type="module" src="${escapeHtml(standaloneScriptSrc)}"></script>
    </body>
  </html>`
}
