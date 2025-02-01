import pkg from "../../package.json"

export const getIndex = async () => {
  return `<html>
    <head>
    </head>
    <body>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
      </style>
    </head>
    <body class="flex justify-center items-center h-screen bg-gray-100">
      <div id="root" class="text-center">
        <div class="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin mx-auto mb-4"></div>
        <div class="text-lg text-gray-700">Loading, please wait...</div>
      </div>
      <script>
      globalThis.process = { env: { NODE_ENV: "production" } }
      </script>
      <script src="/standalone.min.js"></script>
    </body>
  </html>`
}

// <script src="https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${pkg.dependencies["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js"></script>
