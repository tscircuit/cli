import { getSessionToken } from "lib/cli-config"

export const getIndex = async (
  mainComponentPath?: string,
  fileServerApiBaseUrl?: string,
) => {
  const sessionToken = getSessionToken()
  const tokenScript = sessionToken
    ? `\n        window.TSCIRCUIT_REGISTRY_TOKEN = ${JSON.stringify(sessionToken)};`
    : ""
  const fileServerApiScript = fileServerApiBaseUrl
    ? `\n        window.TSCIRCUIT_FILESERVER_API_BASE_URL = ${JSON.stringify(fileServerApiBaseUrl)};`
    : ""
  return `<html>
    <head>
    </head>
    <body>
      <script>
       ${mainComponentPath ? `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = "${mainComponentPath}";` : ""}
        window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = true;${tokenScript}${fileServerApiScript}
      </script>
      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script src="/standalone.min.js"></script>
    </body>
  </html>`
}

// <script src="https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${pkg.dependencies["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js"></script>
