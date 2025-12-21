export interface StaticBuildFileReference {
  filePath: string
  fileStaticAssetUrl: string
}

export interface StaticBuildFileWithData {
  filePath: string
  fileStaticAssetUrl: string
  circuitJson: unknown
}

export interface GetStaticIndexHtmlFileOptions {
  files: StaticBuildFileReference[]
  standaloneScriptSrc?: string
  standaloneScriptContent?: string
  filesWithData?: StaticBuildFileWithData[]
}

export const getStaticIndexHtmlFile = ({
  files,
  standaloneScriptSrc,
  standaloneScriptContent,
  filesWithData,
}: GetStaticIndexHtmlFileOptions) => {
  const useInlineData = filesWithData && filesWithData.length > 0

  const inlineDataScript = useInlineData
    ? `
        window.__TSCIRCUIT_INLINE_DATA__ = ${JSON.stringify(
          Object.fromEntries(
            filesWithData.map((f) => [
              f.fileStaticAssetUrl.replace(/^\.\//, ""),
              f.circuitJson,
            ]),
          ),
        )};
        (function() {
          var originalFetch = window.fetch;
          window.fetch = function(url, options) {
            if (typeof url === 'string') {
              var normalized = url.replace(/^\\.?\\//, '');
              if (window.__TSCIRCUIT_INLINE_DATA__[normalized]) {
                return Promise.resolve(new Response(JSON.stringify(window.__TSCIRCUIT_INLINE_DATA__[normalized]), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }));
              }
            }
            return originalFetch.apply(this, arguments);
          };
        })();`
    : ""

  const standaloneScript = standaloneScriptContent
    ? `<script>${standaloneScriptContent}</script>`
    : `<script type="module" src="${standaloneScriptSrc || "./standalone.min.js"}"></script>`

  return `<html>
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/png" href="https://github.com/tscircuit.png">
    </head>
    <body>
      <script>
        window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;
        window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${JSON.stringify(files)};${inlineDataScript}
      </script>
      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      ${standaloneScript}
    </body>
  </html>`
}
