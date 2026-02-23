export const shouldBeInteractive = () => {
  if (process.env.NODE_ENV === "test") return false
  if (process.env.NODE_ENV === "ci") return false
  if (process.env.CI) return false
  if (process.env.TSCI_TEST_MODE) return false

  if (process.argv.includes("--non-interactive")) return false
  if (process.env.TSCIRCUIT_NON_INTERACTIVE === "1") return false

  if (!process.stdin.isTTY || !process.stdout.isTTY) return false

  return true
}
