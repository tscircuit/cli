import kleur from "kleur"

export const warnMissingCadModel = (partName: string) => {
  console.warn(kleur.yellow(`Warning: No 3D model found for ${partName}.`))
}
