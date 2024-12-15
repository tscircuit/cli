export const getIndex = async () => {
  return `<html>
    <head>
    </head>
    <body>
      <script src="https://cdn.tailwindcss.com"></script>
      <div id="root">loading...</div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script src="https://cdn.jsdelivr.net/npm/@tscircuit/runframe@0.0.10/dist/standalone.min.js"></script>
    </body>
  </html>`
}
// <script src="http://localhost:8000/standalone.umd.cjs"></script>
