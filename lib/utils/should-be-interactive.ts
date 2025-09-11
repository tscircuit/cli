export const shouldBeInteractive = () => {
  if (process.env.NODE_ENV === "test") return false
  if (process.env.NODE_ENV === "ci") return false
  if (process.env.CI) return false
  if (process.env.TSCI_TEST_MODE) return false
  return true
}
