import pkg from "../../package.json"

export const getIndex = async (circuitName: string = "TSCircuit") => {
  return `<html>
    <head>
      <title>${circuitName}</title>
    </head>
    <body>
      <script>
        window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = true;
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
