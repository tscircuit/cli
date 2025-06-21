import { createRequire } from "module"

const require = createRequire(import.meta.url)
const tscircuitPkg = require("tscircuit/package.json") as { version: string }
const corePkg = require("@tscircuit/core/package.json") as { version: string }
const evalPkg = require("@tscircuit/eval/package.json") as { version: string }

export const getTscircuitVersions = () => {
  return {
    tscircuit: tscircuitPkg.version as string,
    core: corePkg.version as string,
    eval: evalPkg.version as string,
  }
}

export const getTscircuitVersionsMessage = () => {
  const v = getTscircuitVersions()
  return `Versions: tscircuit@${v.tscircuit}, @tscircuit/core@${v.core}, @tscircuit/eval@${v.eval}`
}
