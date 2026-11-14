/** Return logical lines outside .subckt definitions, preserving model scope. */
export function getTopLevelSpiceLines(spiceString: string): string[] {
  const logicalLines: string[] = []
  for (const physicalLine of spiceString.split(/\r?\n/)) {
    const line = physicalLine.trim()
    if (!line || line.startsWith("*")) continue
    if (line.startsWith("+") && logicalLines.length > 0) {
      logicalLines[logicalLines.length - 1] += ` ${line.slice(1).trim()}`
    } else {
      logicalLines.push(line)
    }
  }

  let subcircuitDepth = 0
  return logicalLines.filter((line) => {
    if (/^\.subckt\b/i.test(line)) {
      subcircuitDepth++
      return false
    }
    if (/^\.ends\b/i.test(line)) {
      subcircuitDepth--
      return false
    }
    return subcircuitDepth === 0
  })
}
