import { Command } from "commander"
import { DevServer } from "../dev/DevServer"
import { installComponent } from "../lib/installComponent"

export function registerInstall(program: Command) {
  // Register the install command
  program
    .command("install <componentName>")
    .description("Install a component")
    .action(async (componentName: string) => {
      console.log(`Installing component: ${componentName}`)

      // Validate component name
      if (!componentName.trim()) {
        console.error("Error: Component name cannot be empty.")
        return
      }

      // Initialize DevServer with configurable port and dynamic file path
      const devServer = new DevServer({
        port: process.env.PORT ? Number(process.env.PORT) : 3020, // Configurable port
        componentFilePath: `./components/${componentName}.tsx`, // Dynamic path
      })

      try {
        // Handle the installation logic
        await installComponent(componentName, devServer)
        console.log(`Component installed successfully: ${componentName}`)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error"
        console.error(
          `Failed to install component: ${componentName} - ${errorMessage}`,
        )
      }
    })
}
