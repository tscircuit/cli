export const parseDirectLcscPartNumber = (query: string): string | null => {
  const normalizedQuery = query.trim().toUpperCase()
  const directPartMatch = normalizedQuery.match(/^C?(\d+)$/)
  if (!directPartMatch) return null
  return `C${directPartMatch[1]}`
}
