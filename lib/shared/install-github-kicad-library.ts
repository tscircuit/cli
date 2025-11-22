import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import kleur from "kleur"
import { globbySync } from "globby"

/**
 * Install a GitHub repository as a KiCad library
 * @param githubUrl - GitHub URL (e.g., https://github.com/espressif/kicad-libraries)
 */
export async function installGithubKicadLibrary(githubUrl: string) {
  console.log(kleur.gray(`Installing KiCad library from ${githubUrl}...`))

  // Validate GitHub URL
  const githubPattern =
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
  const match = githubUrl.match(githubPattern)

  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
    )
  }

  const [, owner, repo] = match

  // Find project root (where package.json exists or should be created)
  let projectRoot = process.cwd()
  let foundPackageJson = false

  while (projectRoot !== path.parse(projectRoot).root) {
    if (fs.existsSync(path.join(projectRoot, "package.json"))) {
      foundPackageJson = true
      break
    }
    const parent = path.dirname(projectRoot)
    if (parent === projectRoot) break
    projectRoot = parent
  }

  // If we didn't find a package.json, use current directory
  if (!foundPackageJson) {
    projectRoot = process.cwd()
  }

  // Ensure package.json exists
  const packageJsonPath = path.join(projectRoot, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    console.log(kleur.yellow("Creating package.json..."))
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: path.basename(projectRoot),
          version: "0.0.1",
          type: "module",
        },
        null,
        2,
      ),
    )
  }

  // Install the GitHub repository using bun add
  console.log(kleur.gray(`Running: bun add ${githubUrl}`))
  try {
    execSync(`bun add ${githubUrl}`, {
      cwd: projectRoot,
      stdio: "inherit",
    })
  } catch (error) {
    throw new Error(`Failed to install ${githubUrl}`)
  }

  // Generate types file for .kicad_mod files
  await generateKicadTypesForPackage(projectRoot, repo)

  console.log(kleur.green(`✓ Successfully installed ${owner}/${repo}`))
  console.log(
    kleur.gray(
      `\nYou can now import KiCad modules like:\nimport kicadMod from "${repo}/path/to/footprint.kicad_mod"`,
    ),
  )
}

/**
 * Generate TypeScript declaration file for KiCad modules in the installed package
 */
async function generateKicadTypesForPackage(
  projectRoot: string,
  packageName: string,
) {
  const nodeModulesPath = path.join(projectRoot, "node_modules", packageName)

  if (!fs.existsSync(nodeModulesPath)) {
    console.warn(
      kleur.yellow(`Warning: Package ${packageName} not found in node_modules`),
    )
    return
  }

  // Find all .kicad_mod files in the package
  const kicadModFiles = globbySync(["**/*.kicad_mod"], {
    cwd: nodeModulesPath,
    absolute: false,
  })

  if (kicadModFiles.length === 0) {
    console.log(
      kleur.yellow(`No .kicad_mod files found in ${packageName} package`),
    )
    return
  }

  console.log(
    kleur.gray(
      `Found ${kicadModFiles.length} .kicad_mod file(s), generating types...`,
    ),
  )

  // Create types directory if it doesn't exist
  const typesDir = path.join(projectRoot, "types")
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generate .d.ts file with module declarations for each .kicad_mod file
  const typesDtsPath = path.join(typesDir, `${packageName}.d.ts`)
  const declarations = kicadModFiles
    .map((filePath) => {
      const modulePath = `${packageName}/${filePath}`.replace(/\\/g, "/")
      return `declare module "${modulePath}" {
  const value: string
  export default value
}`
    })
    .join("\n\n")

  fs.writeFileSync(typesDtsPath, declarations)

  console.log(kleur.green(`✓ Generated types at types/${packageName}.d.ts`))

  // Ensure tsconfig.json includes the types directory
  ensureTsconfigIncludesTypes(projectRoot)
}

/**
 * Ensure tsconfig.json includes the types directory
 */
function ensureTsconfigIncludesTypes(projectRoot: string) {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json")

  if (!fs.existsSync(tsconfigPath)) {
    console.log(kleur.gray("Creating tsconfig.json..."))
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react",
        jsxImportSource: "@tscircuit/core",
        types: ["tscircuit"],
        typeRoots: ["./node_modules/@types", "./types"],
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    }
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
    return
  }

  try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
    const tsconfig = JSON.parse(tsconfigContent)

    let modified = false

    // Ensure compilerOptions exists
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {}
      modified = true
    }

    // Ensure typeRoots includes ./types
    if (!tsconfig.compilerOptions.typeRoots) {
      tsconfig.compilerOptions.typeRoots = ["./node_modules/@types", "./types"]
      modified = true
    } else if (!tsconfig.compilerOptions.typeRoots.includes("./types")) {
      tsconfig.compilerOptions.typeRoots.push("./types")
      modified = true
    }

    if (modified) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
      console.log(kleur.green("✓ Updated tsconfig.json with types directory"))
    }
  } catch (error) {
    console.warn(
      kleur.yellow("Warning: Could not update tsconfig.json:"),
      error,
    )
  }
}
