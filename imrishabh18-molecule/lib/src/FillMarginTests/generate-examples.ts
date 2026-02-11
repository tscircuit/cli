import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"

const sourceFile = join(__dirname, "FillMarginsDemo.tsx")
const outputDir = join(__dirname, "generated")

// Read the source file
const content = readFileSync(sourceFile, "utf-8")

// Extract all export function declarations (ignore export default)
const exportFunctionRegex = /^export function (\w+)\(\)/gm
const matches = [...content.matchAll(exportFunctionRegex)]

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

// Create .gitignore if it doesn't exist
const gitignorePath = join(outputDir, ".gitignore")
if (!existsSync(gitignorePath)) {
  const gitignoreContent = `# Ignore all files in this generated directory
*
`
  writeFileSync(gitignorePath, gitignoreContent, "utf-8")
  console.log("Created .gitignore file")
}

// Generate a file for each exported function
matches.forEach((match) => {
  const functionName = match[1]

  // Skip if it's a default export
  if (functionName === "default") return

  const fileContent = `import { ${functionName} } from '../FillMarginsDemo';

export default ${functionName};
`

  const outputFile = join(outputDir, `${functionName}.tsx`)
  writeFileSync(outputFile, fileContent, "utf-8")
  console.log(`Generated: ${functionName}.tsx`)
})

console.log(`\nGenerated ${matches.length} example files in ${outputDir}`)
