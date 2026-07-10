import { Resvg } from "@resvg/resvg-js"

export const convertSvgToPngBuffer = async (
  svg: string,
): Promise<Uint8Array> => {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "original",
    },
  })

  return resvg.render().asPng()
}
