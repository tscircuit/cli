export const isCircuitJsonFile = (filePath: string) => {
  const normalizedPath = filePath.toLowerCase().replaceAll("\\", "/")
  return (
    normalizedPath.endsWith(".circuit.json") ||
    normalizedPath.endsWith("/circuit.json")
  )
}
