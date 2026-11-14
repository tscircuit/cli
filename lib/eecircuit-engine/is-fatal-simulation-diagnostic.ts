export const isFatalSimulationDiagnostic = (diagnostic: string): boolean =>
  /^\s*(fatal error\b|error\b|doanalyses:|run simulation\(s\) aborted)/im.test(
    diagnostic,
  )
