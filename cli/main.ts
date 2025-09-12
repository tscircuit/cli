#!/usr/bin/env node
import { Command } from "commander"
import * as path from "path"
import * as chokidar from "chokidar"
import * as fs from "fs"
import { createServer } from "../lib/server/createServer"
import { getLocalFileDependencies } from "../lib/dependency-analysis/getLocalFileDependencies"
// Add GLB export support
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { registerInit } from "./init/register"
import { registerDev } from "./dev/register"
import { registerAuthLogin } from "./auth/login/register"
import { registerAuthLogout } from "./auth/logout/register"
import { registerAuth } from "./auth/register"
import { registerConfig } from "./config/register"
import { registerConfigPrint } from "./config/print/register"
import { registerClone } from "./clone/register"
import { perfectCli } from "perfect-cli"
import { getVersion } from "./../lib/getVersion"
import { registerExport } from "./export/register"
import { registerAuthPrintToken } from "./auth/print-token/register"
import { registerAuthSetToken } from "./auth/set-token/register"
import { registerPush } from "./push/register"
import { registerAdd } from "./add/register"
import { registerUpgradeCommand } from "./upgrade/register"
import { registerConfigSet } from "./config/set/register"
import { registerSearch } from "./search/register"
import { registerImport } from "./import/register"
import { registerRemove } from "./remove/register"
import { registerBuild } from "./build/register"
import { registerSnapshot } from "./snapshot/register"
import { registerSetup } from "./setup/register"
import { registerConvert } from "./convert/register"

export const program = new Command()

program.name("tsci").description("CLI for developing tscircuit packages")

registerInit(program)

registerDev(program)
registerClone(program)
registerPush(program)

registerAuth(program)
registerAuthLogin(program)
registerAuthLogout(program)
registerAuthPrintToken(program)
registerAuthSetToken(program)

registerConfig(program)
registerConfigPrint(program)
registerConfigSet(program)

registerExport(program)
registerBuild(program)
registerAdd(program)
registerRemove(program)
registerSnapshot(program)
registerSetup(program)

registerUpgradeCommand(program)

registerSearch(program)
registerImport(program)
registerConvert(program)

// Manually handle --version, -v, and -V flags
if (
  process.argv.includes("--version") ||
  process.argv.includes("-v") ||
  process.argv.includes("-V")
) {
  console.log(getVersion())
  process.exit(0)
}

// Add a custom version command
program
  .command("version")
  .description("Print CLI version")
  .action(() => {
    console.log(getVersion())
  })

program
  .command("export")
  .description("Export snippet to a file")
  .argument("<file>", "Path to the snippet file")
  .option("-f, --format <format>", "Export format (json|glb)", "json")
  .option("-o, --output <output>", "Output file path")
  .action(async (file: string, options: { format: string, output?: string }) => {
    const absolutePath = path.resolve(file);
    const format = options.format;
    const outputPath = options.output || (format === "glb" ? "snippet.glb" : "snippet.json");

    // Load the snippet data (assumes default export)
    let snippetData;
    try {
      snippetData = (await import(absolutePath)).default;
    } catch (err) {
      console.error("Failed to load snippet:", err);
      process.exit(1);
    }

    if (format === "glb") {
      const glbBuffer = await convertCircuitJsonToGltf(snippetData, { format: "glb" });
      if (glbBuffer instanceof ArrayBuffer) {
        await fs.promises.writeFile(outputPath, Buffer.from(new Uint8Array(glbBuffer)));
      } else if (Buffer.isBuffer(glbBuffer)) {
        await fs.promises.writeFile(outputPath, glbBuffer);
      } else if (glbBuffer instanceof Uint8Array) {
        await fs.promises.writeFile(outputPath, Buffer.from(glbBuffer));
      } else {
        throw new Error("Unsupported GLB buffer type returned by convertCircuitJsonToGltf");
      }
      console.log(`Exported GLB to ${outputPath}`);
    } else {
      const gltf = await convertCircuitJsonToGltf(snippetData, { format: "gltf" });
      await fs.promises.writeFile(outputPath, JSON.stringify(gltf, null, 2));
      console.log(`Exported JSON to ${outputPath}`);
    }
  });

program.parse()
if (process.argv.length === 2) {
  // perfectCli uses commander@12 internally which is not strictly
  // compatible with commander@14's TypeScript types. Cast to any to
  // avoid a type mismatch.
  perfectCli(program as any, process.argv).catch((err) => {
    // Handle cancelled interactive sessions gracefully
    if (err instanceof Error && err.name === "TypeError") {
      console.error("\nAborted.")
      process.exit(130)
    }
    throw err
  })
} else {
  program.parse()
}
