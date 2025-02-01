import pkg from "../../package.json"

export const getIndex = async () => {
  return `<html>
    <head>
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
        <div id="status" class="text-lg text-gray-700">Loading, please wait...</div>
      </div>
      <script>
        globalThis.process = { env: { NODE_ENV: "production" } }

        // Function to load the circuit script
        function loadCircuitScript() {
          const script = document.createElement('script')
          script.src = '/standalone.min.js'
          document.body.appendChild(script)
          console.log("Circuit script loaded") // Log when the script is loaded
        }

        // WebSocket connection to receive messages from the server
        const ws = new WebSocket("ws://localhost:3020")
        ws.onopen = () => {
          console.log("WebSocket connection established")
        }
        ws.onmessage = (event) => {
          console.log("WebSocket message received:", event.data) // Log to browser console

          const statusElement = document.getElementById('status')
          const spinnerElement = document.querySelector('.spinner')

          if (!statusElement || !spinnerElement) {
            console.error("Status or spinner element not found")
            return
          }

          console.log("Before updating UI: statusElement.textContent =", statusElement.textContent)

          if (event.data === " circuit is rendering...") {
            console.log("Updating UI: circuit is rendering...")
            statusElement.textContent = "Circuit is rendering..."
            statusElement.className = "text-lg text-orange-500"
            spinnerElement.className = "spinner border-t-4 border-orange-500 rounded-full w-12 h-12 animate-spin mx-auto mb-4"
            console.log("After updating UI: statusElement.textContent =", statusElement.textContent)
          } else if (event.data === "circuit is ready") {
            console.log("Updating UI: circuit is ready")
            statusElement.textContent = "Circuit is ready"
            statusElement.className = "text-lg text-green-500"
            spinnerElement.className = "hidden"
            console.log("After updating UI: statusElement.textContent =", statusElement.textContent)
            // Load the circuit script after rendering is complete
            loadCircuitScript()
          }
        }

        ws.onclose = () => {
          console.log("WebSocket connection closed")
        }

        // Always load the circuit script initially
        loadCircuitScript()
      </script>
      <script src="/standalone.min.js"></script>
    </body>
  </html>`
}

// <script src="https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${pkg.dependencies["@tscircuit/runframe"].replace(/^[^0-9]+/, "")}/dist/standalone.min.js"></script>
