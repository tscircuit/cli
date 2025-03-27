import { Command } from "commander";
import { EventEmitter } from "events";
import { installComponent } from "../../lib/installComponent";

const eventEmitter = new EventEmitter();

export function registerInstall(program: Command) {
  program
    .command("install <componentName>")
    .description("Install a component")
    .action(async (componentName: string) => {
      console.log(`Installing component: ${componentName}`);
      try {
        // Emit INSTALL_COMPONENT event
        eventEmitter.emit("INSTALL_COMPONENT", componentName);

        // Handle the installation logic
        await installComponent(componentName);

        // Emit success event
        eventEmitter.emit("COMPONENT_INSTALLED", componentName);
        console.log(`Component installed successfully: ${componentName}`);
      } catch (error) {
        // Emit failure event
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        eventEmitter.emit("COMPONENT_INSTALL_FAILED", componentName, errorMessage);
        console.error(`Failed to install component: ${componentName}`, errorMessage);
      }
    });
}