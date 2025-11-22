import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"
import { extractGitHubInfo } from "../shared/extract-github-info"

/**
 * Prints usage examples for imported KiCad footprints
 */
export async function printKicadRepoUsage(
  packageName: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const nodeModulesPath = path.join(cwd, "node_modules")

  // Extract the package directory name from the normalized package name
  const info = extractGitHubInfo(packageName)
  let packageDirName = packageName

  if (info) {
    packageDirName = info.repo
  }

  const packagePath = path.join(nodeModulesPath, packageDirName)

  if (!fs.existsSync(packagePath)) {
    return
  }

  // Find all .kicad_mod files in the package
  const kicadModFiles = await glob("**/*.kicad_mod", {
    cwd: packagePath,
    absolute: false,
  })

  if (kicadModFiles.length === 0) {
    return
  }

  console.log(
    `\nFound ${kicadModFiles.length} KiCad footprint(s) in ${packageDirName}:`,
  )
  console.log("\nYou can import them like this:")
  console.log("```tsx")

  // Show first few examples
  const exampleCount = Math.min(3, kicadModFiles.length)
  for (let i = 0; i < exampleCount; i++) {
    const file = kicadModFiles[i]
    const importPath = `${packageDirName}/${file}`
    const varName = path
      .basename(file, ".kicad_mod")
      .replace(/[^a-zA-Z0-9]/g, "_")
    console.log(`import ${varName} from "${importPath}"`)
  }

  if (kicadModFiles.length > exampleCount) {
    console.log(`// ... and ${kicadModFiles.length - exampleCount} more`)
  }

  console.log("\n// Then use in your circuit:")
  console.log('<chip footprint={ESP32_C3_DevKitM_1} name="U1" />')
  console.log("```")
}
