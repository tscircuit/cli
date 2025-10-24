import * as fs from "node:fs"
import * as path from "node:path"

export const handleExistingDirectory = async (dirPath: string) => {
  if (!fs.existsSync(dirPath)) return

  const prompts = await import("prompts")
  const response = await prompts.default({
    type: "select",
    name: "action",
    message: `Directory "${path.basename(dirPath)}" already exists. What would you like to do?`,
    choices: [
      { title: "Merge files into existing directory", value: "merge" },
      {
        title: "Delete existing directory and clone fresh",
        value: "delete",
      },
      { title: "Cancel", value: "cancel" },
    ],
  })

  if (!response.action || response.action === "cancel") {
    console.log("Clone cancelled.")
    process.exit(0)
  }

  if (response.action === "delete") {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`Deleted existing directory: ${dirPath}`)
  } else if (response.action === "merge") {
    console.log(`Merging files into existing directory: ${dirPath}`)
  }
}
