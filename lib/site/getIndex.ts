import { getSessionToken } from "lib/cli-config"
import { getPartsEngineBaseUrls } from "lib/shared/parts-engine-base-urls"
import { getTscircuitDependencyVersion } from "lib/shared/get-tscircuit-dependency-version"
import type { TscircuitProjectConfig } from "lib/project-config/project-config-schema"
import { serializeScriptValue } from "./serialize-script-value"

interface GetIndexOptions {
  mainComponentPath?: string
  fileServerApiBaseUrl?: string
  jscdnBaseUrl?: string
  extraRunFrameTabs?: TscircuitProjectConfig["extraRunFrameTabs"]
}

export const getIndex = async ({
  mainComponentPath,
  fileServerApiBaseUrl,
  jscdnBaseUrl,
  extraRunFrameTabs = [],
}: GetIndexOptions = {}) => {
  const standalone = process.env.TSCIRCUIT_STANDALONE === "1"
  const evalVersion = getTscircuitDependencyVersion("@tscircuit/eval")
  const standaloneScript = standalone
    ? `
        window.TSCIRCUIT_LATEST_EVAL_VERSION = ${JSON.stringify(evalVersion)};
        window.TSCIRCUIT_ALLOW_SELECTING_EVAL_VERSION = false;
        window.TSCIRCUIT_TELEMETRY_DISABLED = true;`
    : ""
  const sessionToken = getSessionToken()
  const tokenScript = sessionToken
    ? `\n        window.TSCIRCUIT_REGISTRY_TOKEN = ${JSON.stringify(sessionToken)};`
    : ""
  const fileServerApiScript = fileServerApiBaseUrl
    ? `\n        window.TSCIRCUIT_FILESERVER_API_BASE_URL = ${JSON.stringify(fileServerApiBaseUrl)};`
    : ""
  const jscdnScript = jscdnBaseUrl
    ? `\n        window.TSCIRCUIT_JSCDN_BASE_URL = ${JSON.stringify(jscdnBaseUrl).replace(/</g, "\\u003c")};`
    : ""
  const partsEngineBaseUrls = getPartsEngineBaseUrls()
  const partsEngineScript = Object.keys(partsEngineBaseUrls).length
    ? `\n        Object.assign(window, ${JSON.stringify(partsEngineBaseUrls).replace(/</g, "\\u003c")});`
    : ""
  return `<html>
    <head>
      <meta charset="UTF-8" />
      ${standalone ? '<link rel="icon" href="data:,">' : '<link rel="icon" type="image/png" href="https://github.com/tscircuit.png">'}
    </head>
    <body>
      <script>
       ${mainComponentPath ? `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = ${serializeScriptValue(mainComponentPath)};` : ""}
        window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = true;${tokenScript}${fileServerApiScript}${jscdnScript}${partsEngineScript}${standaloneScript}
        window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = ${serializeScriptValue(extraRunFrameTabs)};
      </script>
      ${standalone ? "" : '<script src="https://cdn.tailwindcss.com"></script>'}
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      ${fileServerApiBaseUrl ? '<script src="/extra-runframe-tabs.js" defer></script>' : ""}
      <script type="module" src="/standalone.min.js"></script>
    </body>
  </html>`
}
