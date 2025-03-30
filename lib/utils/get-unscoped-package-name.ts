// Gets the unscoped package name from the following formats:
// - @tsci/username.package-name
// - @author/package-name
export const getUnscopedPackageName = (packageName: string) => {
  return packageName
    .replace(/^@[^\.]+\./, "")
    .split("/")
    .pop()
}
