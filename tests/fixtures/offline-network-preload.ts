import { appendFileSync } from "node:fs"

// Record even caught requests, so swallowed telemetry/skill errors cannot pass.
const rejectNetwork = () => {
  appendFileSync(process.env.TSCI_NETWORK_ATTEMPTS!, "fetch\n")
  throw new Error("Unexpected outbound request in standalone")
}
globalThis.fetch = Object.assign(rejectNetwork, { preconnect: rejectNetwork })
