// Gets the author from the following formats:
// - @tsci/username.package-name
// - @author/package-name
export const getPackageAuthor = (packageName: string) => {
  if (packageName.startsWith("@tsci/")) {
    return packageName.split("/")[1].split(".")[0]
  }
  return packageName.split("/")[0].replace("@", "")
}
