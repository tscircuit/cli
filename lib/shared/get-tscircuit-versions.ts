import tscircuitPkg from "tscircuit/package.json" assert { type: "json" }
import corePkg from "@tscircuit/core/package.json" assert { type: "json" }
import evalPkg from "@tscircuit/eval/package.json" assert { type: "json" }

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
