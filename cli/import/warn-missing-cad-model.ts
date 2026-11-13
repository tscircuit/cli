import kleur from "kleur"

export const warnMissingCadModel = (partName: string) => {
  console.warn(
    kleur.yellow(
      `Warning: ${partName} was imported without an explicit 3D model. The 3D view may use generated geometry instead. Add a cadModel if you need a detailed model.`,
    ),
  )
}
