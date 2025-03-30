export const shouldBeInteractive = () => {
  return (
    process.env.NODE_ENV !== "test" &&
    process.env.NODE_ENV !== "ci" &&
    !process.env.CI
  )
}
