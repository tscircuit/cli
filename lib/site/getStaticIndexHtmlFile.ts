import { loadingStateUi } from "./loadingStateUi"

export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
  defaultMainComponentPath?: string
  packageName?: string
  jscdnBaseUrl?: string
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc = "./standalone.min.js",
  defaultMainComponentPath,
  packageName,
  jscdnBaseUrl,
}: GetStaticIndexHtmlFileOptions) => {
  const scriptLines = [
    "window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;",
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${JSON.stringify(files)};`,
    ...(jscdnBaseUrl !== undefined
      ? [
          `window.TSCIRCUIT_JSCDN_BASE_URL = ${JSON.stringify(jscdnBaseUrl).replace(/</g, "\\u003c")};`,
        ]
      : []),
    ...(defaultMainComponentPath
      ? [
          `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = ${JSON.stringify(defaultMainComponentPath)};`,
        ]
      : []),
    ...(packageName
      ? [`window.TSCIRCUIT_PACKAGE_NAME = ${JSON.stringify(packageName)};`]
      : []),
  ]

  const scriptBlock = `      <script>\n        ${scriptLines.join("\n        ")}\n      </script>\n`
  // A failed module script needs a new element to retry on another CDN.
  const cdnFallback = standaloneScriptSrc.startsWith(
    "https://cdn.jsdelivr.net/npm/tscircuit@",
  )
    ? ` onerror="const script = document.createElement('script'); script.type = 'module'; script.src = this.src.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'); this.after(script)"`
    : ""

  return `<html>
    <head>
      <link rel="icon" type="image/png" href="https://github.com/tscircuit.png">
      <meta charset="UTF-8" />
      <title>${packageName || "tscircuit"}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
${scriptBlock}      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">${loadingStateUi}</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script type="module" src="${standaloneScriptSrc}"${cdnFallback}></script>
    </body>
  </html>`
}
