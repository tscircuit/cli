export const getJlcpcbImportErrorMessage = (
  jlcpcbPartNumber: string,
  error: unknown,
) => {
  const baseMessage =
    error instanceof Error ? error.message : String(error ?? "Unknown error")

  return [
    `JLCPCB/EasyEDA import failed for ${jlcpcbPartNumber}.`,
    `Fetch failed while searching easyeda.com/api/components/search: ${baseMessage}`,
  ].join("\n")
}
