// Gets the author from the following formats:
// - @tsci/username.package-name
// - @author/package-name
// - username/package-name
// Returns empty string if no author is present (e.g., just "package-name")
export const getPackageAuthor = (packageName: string) => {
  if (packageName.startsWith("@tsci/")) {
    return packageName.split("/")[1].split(".")[0]
  }
  // Check if there's a slash (indicating author/package format)
  if (packageName.includes("/")) {
    return packageName.split("/")[0].replace("@", "")
  }
  // No author present, return empty string
  return ""
}
