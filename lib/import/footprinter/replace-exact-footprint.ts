export const replaceExactFootprint = (
  tsx: string,
  footprinterString: string,
  pinMap: Map<string, string>,
) => {
  const exactFootprintPattern = /footprint=\{<footprint>[\s\S]*?<\/footprint>\}/
  if (!exactFootprintPattern.test(tsx)) {
    throw new Error("Could not find the generated exact footprint in TSX")
  }

  let compactTsx = tsx.replace(
    exactFootprintPattern,
    `footprint=${JSON.stringify(footprinterString)}`,
  )
  const remappedPins = [...pinMap].filter(
    ([footprinterHint, targetHint]) => footprinterHint !== targetHint,
  )
  if (!remappedPins.length) return compactTsx

  const mappingLines = remappedPins
    .map(
      ([footprinterHint, targetHint]) =>
        `  ${JSON.stringify(targetHint)}: [...pinLabels[${JSON.stringify(
          targetHint,
        )}], ${JSON.stringify(footprinterHint)}],`,
    )
    .join("\n")
  const remappedPinLabels = [
    "const footprinterPinLabels = {",
    "  ...pinLabels,",
    mappingLines,
    "} as const",
    "",
  ].join("\n")
  const exportIndex = compactTsx.indexOf("export const ")
  if (exportIndex === -1 || !compactTsx.includes("pinLabels={pinLabels}")) {
    throw new Error("Could not remap generated TSX pin labels")
  }

  compactTsx =
    compactTsx.slice(0, exportIndex) +
    remappedPinLabels +
    "\n" +
    compactTsx.slice(exportIndex)
  return compactTsx.replace(
    "pinLabels={pinLabels}",
    "pinLabels={footprinterPinLabels}",
  )
}
