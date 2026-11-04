import type { AnyCircuitElement } from "circuit-json"

export const renderSystemSvg = async (
  circuitJson: AnyCircuitElement[],
  systemBlockPageId: string,
) => {
  const { convertCircuitJsonToSystemSvg } = await import("circuit-to-svg")
  if (!convertCircuitJsonToSystemSvg)
    throw new Error(
      "System SVG rendering requires a newer tscircuit installation. Update to tscircuit >= 0.0.3087.",
    )
  return convertCircuitJsonToSystemSvg(circuitJson, { systemBlockPageId })
}

export const getSystemSvgAssets = async (circuitJson: AnyCircuitElement[]) => {
  const pages = circuitJson.filter((e) => e.type === "system_block_page")
  const usedNames = new Set<string>()
  return Promise.all(
    pages.map(async (page, index) => {
      const stem =
        (page.name || page.system_block_page_id)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `page-${index + 1}`
      let name = stem
      let suffix = 2
      while (usedNames.has(name)) name = `${stem}-${suffix++}`
      usedNames.add(name)
      return {
        fileName: pages.length === 1 ? "system.svg" : `system-${name}.svg`,
        svg: await renderSystemSvg(circuitJson, page.system_block_page_id),
      }
    }),
  )
}
