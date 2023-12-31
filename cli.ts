#!/usr/bin/env node

import { AppContext } from "./lib/util/app-context"
import { parseArgs } from "./lib/util/parse-args"

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const ctx: AppContext = {}
}

main().catch((e) => {
  console.log("Error running CLI:", e.toString())
})
