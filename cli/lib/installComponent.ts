import fs from "fs/promises"
import path from "path"
import { DevServer } from "../dev/DevServer"

/**
 * Fetch the available components dynamically
 */
async function getAvailableComponents(): Promise<string[]> {
  try {
    const data = await fs.readFile("./components.json", "utf-8") // Example JSON file
    const components = JSON.parse(data)
    if (!Array.isArray(components)) {
      throw new Error("Invalid components.json format: Expected an array.")
    }
    return components
  } catch (error) {
    console.error("Failed to fetch available components:", error)
    return [] // Return an empty array if the file can't be read
  }
}

/**
 * Helper function to emit events via DevServer
 */
async function emitEvent(
  devServer: DevServer,
  eventType: string,
  message: string,
) {
  if (!devServer.fsKy) {
    console.error(
      `DevServer is not initialized. Cannot emit event: ${eventType}`,
    )
    return
  }
  try {
    await devServer.fsKy.post("api/events/create", {
      json: { event_type: eventType, message },
    })
  } catch (error) {
    console.error(`Failed to emit event ${eventType}:`, error)
  }
}

/**
 * Install a component
 */
export async function installComponent(
  componentName: string,
  devServer: DevServer,
): Promise<void> {
  console.log(`Starting installation for ${componentName}...`)

  // Emit INSTALL_COMPONENT event
  await emitEvent(devServer, "INSTALL_COMPONENT", `Installing ${componentName}`)

  // Fetch available components dynamically
  const availableComponents = await getAvailableComponents()
  console.log("Available Components:", availableComponents)

  if (!availableComponents.includes(componentName)) {
    await emitEvent(
      devServer,
      "COMPONENT_INSTALL_FAILED",
      `Component ${componentName} does not exist in the repository.`,
    )
    throw new Error(
      `Component ${componentName} does not exist in the repository.`,
    )
  }

  console.log(`Downloading component: ${componentName}...`)
  await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate delay

  const installDir = path.resolve("installed-components")
  const filePath = path.join(installDir, `${componentName}.tsx`) // Use .tsx extension

  try {
    await fs.mkdir(installDir, { recursive: true })
    await fs.writeFile(
      filePath,
      `Component ${componentName} installed successfully.`,
    )
    console.log(`Component ${componentName} installed successfully.`)

    // Emit COMPONENT_INSTALLED event
    await emitEvent(
      devServer,
      "COMPONENT_INSTALLED",
      `Component ${componentName} installed successfully.`,
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    await emitEvent(
      devServer,
      "COMPONENT_INSTALL_FAILED",
      `Component ${componentName} failed to install. Error: ${errorMessage}`,
    )
    console.error(`Error installing component ${componentName}:`, error)
    throw error
  }
}
