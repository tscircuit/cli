#!/usr/bin/env bun
import manifest from "../package.json"
for (const section of [
  "dependencies",
  "devDependencies",
  "peerDependencies",
] as const) {
  if (
    "tscircuit" in
    (((manifest as Record<string, unknown>)[section] as Record<
      string,
      unknown
    >) ?? {})
  ) {
    throw new Error(`CLI must not depend on tscircuit in ${section}`)
  }
}
console.log("CLI owns its runtime dependencies without tscircuit-libonly")
