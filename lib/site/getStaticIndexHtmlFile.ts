export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
  defaultMainComponentPath?: string
  packageName?: string
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc = "./standalone.min.js",
  defaultMainComponentPath,
  packageName,
}: GetStaticIndexHtmlFileOptions) => {
  const scriptLines = [
    "window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;",
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${JSON.stringify(files)};`,
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

  return `<html>
    <head>
      <link rel="icon" type="image/png" href="https://github.com/tscircuit.png">
      <meta charset="UTF-8" />
      <title>tscircuit</title>
    </head>
    <body>
${scriptBlock}      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script type="module" src="${standaloneScriptSrc}"></script>
    </body>
  </html>`
}
