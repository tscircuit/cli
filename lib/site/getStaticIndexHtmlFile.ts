import { loadingStateUi } from "./loadingStateUi"
import type { PlatformConfig } from "@tscircuit/props"
import {
  escapeHtml,
  getRunframeBootScript,
  scriptSafeJson,
} from "./browser-platform-config"

export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
  defaultMainComponentPath?: string
  packageName?: string
  platformConfig?: PlatformConfig
  platformConfigScriptSrc?: string
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc = "./standalone.min.js",
  defaultMainComponentPath,
  packageName,
  platformConfig = { jscdnBaseUrl: "./jscdn" },
  platformConfigScriptSrc,
}: GetStaticIndexHtmlFileOptions) => {
  const scriptLines = [
    "window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;",
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${scriptSafeJson(files)};`,
    `window.TSCIRCUIT_PLATFORM_CONFIG = ${scriptSafeJson(platformConfig)};`,
    ...(defaultMainComponentPath
      ? [
          `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = ${scriptSafeJson(defaultMainComponentPath)};`,
        ]
      : []),
    ...(packageName
      ? [`window.TSCIRCUIT_PACKAGE_NAME = ${scriptSafeJson(packageName)};`]
      : []),
  ]

  const scriptBlock = `      <script>\n        ${scriptLines.join("\n        ")}\n      </script>\n`

  return `<html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(packageName || "tscircuit")}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
${scriptBlock}
      <div id="root">${loadingStateUi}</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      ${getRunframeBootScript(standaloneScriptSrc, platformConfigScriptSrc)}
    </body>
  </html>`
}
