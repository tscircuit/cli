import kleur from "kleur"

export const exitBuild = (code: number, reason: string): never => {
  const message = `Build exiting with code ${code}: ${reason}`
  if (code === 0 || code === 2) {
    console.log(kleur.dim(message))
  } else {
    console.error(kleur.yellow(message))
  }
  process.exit(code)
}
