import * as fs from "node:fs"
import * as path from "node:path"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"
import { getPackageAuthor } from "lib/utils/get-package-author"
import { getUnscopedPackageName } from "lib/utils/get-unscoped-package-name"

export const pullPackage = async (projectDir: string = process.cwd()) => {
  const packageJsonPath = path.join(projectDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw {
      error_code: "package_json_not_found",
      message: "package.json not found",
    }
  }

  let packageJson: { name?: string }
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
  } catch {
    throw {
      error_code: "invalid_package_json",
      message: "Invalid package.json",
    }
  }

  if (!packageJson.name) {
    throw {
      error_code: "package_name_missing",
      message: "Package name missing in package.json",
    }
  }

  const author = getPackageAuthor(packageJson.name)
  const unscopedName = getUnscopedPackageName(packageJson.name)

  const ky = getRegistryApiKy()
  let fileList: { package_files: Array<{ file_path: string }> } = {
    package_files: [],
  }
  try {
    fileList = await ky
      .post<{ package_files: Array<{ file_path: string }> }>(
        "package_files/list",
        {
          json: {
            package_name: `${author}/${unscopedName}`,
            use_latest_version: true,
          },
        },
      )
      .json()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw {
      error_code: "fetch_failed",
      message: `Failed to fetch package files: ${message}`,
    }
  }

  for (const fileInfo of fileList.package_files) {
    const relative = fileInfo.file_path.replace(/^\/|dist\//g, "")
    if (!relative) continue
    const fullPath = path.join(projectDir, relative)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    try {
      const fileContent = await ky
        .post<{ package_file: { content_text: string } }>("package_files/get", {
          json: {
            package_name: `${author}/${unscopedName}`,
            file_path: fileInfo.file_path,
          },
        })
        .json()
      fs.writeFileSync(fullPath, fileContent.package_file.content_text)
      console.log(kleur.gray(`\u2b07 ${relative}`))
    } catch (error) {
      console.warn(
        `Skipping ${relative} due to error:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  console.log(kleur.green("Package updated from registry"))
}
