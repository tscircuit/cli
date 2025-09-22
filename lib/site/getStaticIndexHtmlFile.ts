export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc = "./standalone.min.js",
}: GetStaticIndexHtmlFileOptions) => {
  const scriptLines = [
    "window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;",
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${JSON.stringify(files)};`,
  ]

  const scriptBlock = `      <script>\n        ${scriptLines.join("\n        ")}\n      </script>\n`

  return `<html>
    <head>
    </head>
    <body>
${scriptBlock}      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script src="${standaloneScriptSrc}"></script>
    </body>
  </html>`
}
