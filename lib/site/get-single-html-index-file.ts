import { loadingStateUi } from "./loadingStateUi"
import { serializeScriptValue } from "./serialize-script-value"

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/** A one-file deployment with inline circuit data and a CDN preview runtime. */
export const getSingleHtmlIndexFile = ({
  circuitJson,
  standaloneScriptSrc,
  packageName,
  jscdnBaseUrl,
}: {
  circuitJson: unknown[]
  standaloneScriptSrc: string
  packageName?: string
  jscdnBaseUrl?: string
}) => {
  const scriptLines = [
    `window.CIRCUIT_JSON = ${serializeScriptValue(circuitJson)};`,
    'window.CIRCUIT_JSON_PREVIEW_PROPS = { defaultActiveTab: "pcb", autoRotate3dViewerDisabled: true, showRightHeaderContent: true };',
    ...(jscdnBaseUrl
      ? [
          `window.TSCIRCUIT_JSCDN_BASE_URL = ${serializeScriptValue(jscdnBaseUrl)};`,
        ]
      : []),
    'globalThis.process = { env: { NODE_ENV: "production" } };',
  ]

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(packageName || "tscircuit")}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="data:,">
    <style>html, body, #root { margin: 0; width: 100%; height: 100%; }</style>
  </head>
  <body>
    <div id="root">${loadingStateUi}</div>
    <script>
      ${scriptLines.join("\n      ")}
    </script>
    <script type="module" src="${escapeHtml(standaloneScriptSrc)}" onerror="document.getElementById('root').textContent = 'Could not load the circuit viewer. Check your connection and reload.';"></script>
  </body>
</html>`
}
