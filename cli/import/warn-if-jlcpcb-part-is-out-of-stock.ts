import kleur from "kleur"

export const warnIfJlcpcbPartIsOutOfStock = ({
  partNumber,
  stock,
}: {
  partNumber: string
  stock?: number
}) => {
  if (typeof stock !== "number" || stock > 0) return

  console.warn(
    kleur.yellow(
      `Warning: ${partNumber} is currently out of stock at JLCPCB. The component will still be imported.`,
    ),
  )
}
