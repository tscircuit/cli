import { getSessionToken } from "lib/cli-config"
import type { PlatformConfig } from "@tscircuit/props"
import {
  getRunframeBootScript,
  scriptSafeJson,
} from "./browser-platform-config"

export const getIndex = async (
  mainComponentPath?: string,
  fileServerApiBaseUrl?: string,
  platformConfig: PlatformConfig = { jscdnBaseUrl: "/jscdn" },
  platformConfigScriptSrc?: string,
) => {
  const sessionToken = getSessionToken()
  const tokenScript = sessionToken
    ? `\n        window.TSCIRCUIT_REGISTRY_TOKEN = ${scriptSafeJson(sessionToken)};`
    : ""
  const fileServerApiScript = fileServerApiBaseUrl
    ? `\n        window.TSCIRCUIT_FILESERVER_API_BASE_URL = ${scriptSafeJson(fileServerApiBaseUrl)};`
    : ""
  return `<html>
    <head>
      <meta charset="UTF-8" />
    </head>
    <body>
      <script>
       ${mainComponentPath ? `window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH = ${scriptSafeJson(mainComponentPath)};` : ""}
        window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = true;${tokenScript}${fileServerApiScript}
        window.TSCIRCUIT_PLATFORM_CONFIG = ${scriptSafeJson(platformConfig)};
      </script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      ${getRunframeBootScript("/standalone.min.js", platformConfigScriptSrc)}
    </body>
  </html>`
}
