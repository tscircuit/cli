import * as CMDFN from "cli/lib/cmd-fns"
import { Command } from "commander"
import type { AppContext } from "./util/app-context"

export const getProgram = (ctx: AppContext) => {
  const cmd = new Command("tsci").description(
    "Develop, test and manage tscircuit packages",
  )

  cmd
    .command("dev")
    .description("Run development server in current directory")
    .option("--cwd <cwd>", "Current working directory")
    .option("--port <port>", "Port to run dev server on")
    .option("--no-core", "Use @tscircuit/core beta", false)
    .option("--no-cleanup", "Don't cleanup temporary files (for debugging)")
    .action((args) => CMDFN.dev(ctx, args))

  cmd
    .command("init")
    .description("Initialize a new tscircuit project")
    .option("--name <name>", "Name of the project")
    .option(
      "--runtime <runtime>",
      "Runtime to use (attempts to bun, otherwise node/tsx)",
    )
    .option(
      "--dir <dir>",
      "Directory to initialize (defaults to ./<name> or . if name not provided)",
    )
    .action((args) => CMDFN.init(ctx, args))

  cmd
    .command("add")
    .description("Add a package from the tscircuit registry")
    .argument(
      "<packages...>",
      "Packages to install from registry.tscircuit.com, optionally with version",
    )
    .option("-D, --dev", "Add to devDependencies")
    .action((packages, flags) => CMDFN.add(ctx, { packages, flags }))

  cmd
    .command("remove")
    .description("Remove/uninstall a package")
    .argument("<packages...>", "Packages to remove")
    .action((packages, flags) => CMDFN.remove(ctx, { packages, flags }))

  cmd
    .command("lint")
    .description("Lint all TypeScript files in the project")
    .option("--fix", "Automatically fix problems")
    .action((args) => CMDFN.lint(ctx, args))

  cmd
    .command("go")
    .description("Open browser to the TSCircuit Get Started tutorial")
    .action((args) => CMDFN.go(ctx, args))

  cmd
    .command("render")
    .description("Render circuit as image")
    .requiredOption("--input <input>", "Input TypeScript file path")
    .option("--pcb", "Render PCB view")
    .option("--schematic", "Render schematic view")
    .option("--output <output>", "Output file path")
    .option("-t, --type <type>", "Output file type (png or svg)")
    .action((args) => CMDFN.render(ctx, args))

  const genCmd = cmd.command("gen").description("Generate components")
  genCmd
    .command("jlcpcb <jlcpcbPartNumberOrUrl>")
    .description("Generate JLCPCB-specific files")
    .action((partNumberOrUrl, args) =>
      CMDFN.genJlcpcbComponent(ctx, { partNumberOrUrl, ...args }),
    )

  const authCmd = cmd.command("auth").description("Login/logout")
  authCmd
    .command("login")
    .description("Authenticate CLI, login to registry")
    .action((args) => CMDFN.authLogin(ctx, args))
  authCmd
    .command("logout")
    .description("Clear local authentication")
    .action((args) => CMDFN.authLogout(ctx, args))

  const configCmd = cmd
    .command("config")
    .description("Manage the local tsci configuration")

  configCmd
    .command("reveal-location")
    .description("Log the location of the config file")
    .action((args) => CMDFN.configRevealLocation(ctx, args))
  configCmd
    .command("set-registry")
    .description("Set the registry API url")
    .requiredOption("--server <server>", "Registry URL")
    .action((args) => CMDFN.configSetRegistry(ctx, args))
  configCmd
    .command("set-session")
    .description("Set the session token manually")
    .requiredOption("--session-token <session_token>", "Session Token")
    .action((args) => CMDFN.configSetSession(ctx, args))
  configCmd
    .command("set-runtime")
    .description("Set runtime to use, bun or node")
    .requiredOption(
      "--runtime <runtime>",
      "Bun or node. Setting to bun generally doubles soupification speed.",
    )
    .action((args) => CMDFN.configSetRuntime(ctx, args))
  configCmd
    .command("set-log-requests")
    .description("Set whether to log requests to registry (noisy)")
    .requiredOption("--log-requests", "Should log requests to registry")
    .action((args) => CMDFN.configSetLogRequests(ctx, args))
  configCmd
    .command("print-config")
    .description("Print the current config")
    .action((args) => CMDFN.configPrintConfig(ctx, args))
  configCmd
    .command("clear")

    .action((args) => CMDFN.configClear(ctx, args))

  // const authSessionsCmd = authCmd.command("sessions")
  // authSessionsCmd
  //   .command("create")
  //   .action((args) => CMDFN.authSessionsCreate(ctx, args))
  // authSessionsCmd
  //   .command("list")
  //   .action((args) => CMDFN.authSessionsList(ctx, args))
  // authSessionsCmd
  //   .command("get")
  //   .action((args) => CMDFN.authSessionsGet(ctx, args))

  const packagesCmd = cmd.command("packages").description("Manage packages")

  packagesCmd.command("list").action((args) => CMDFN.packagesList(ctx, args))
  packagesCmd
    .command("get")
    .description("Get information about a package")
    .option("--package-id <package_id>", "Package Id")
    .option("--name <name>", "Package name")
    .action((args) => CMDFN.packagesGet(ctx, args))
  packagesCmd
    .command("create")
    .description("Create a new package")
    .requiredOption("--name <name>", "Package name")
    .option("--author-id <author_account_id>", "Author Id")
    .option("--description <description>", "Package description")
    .action((args) => CMDFN.packagesCreate(ctx, args))

  const packageReleases = cmd.command("package_releases")

  packageReleases
    .command("list")
    .description("List all package releases for a package")
    .requiredOption("--package-name <package_name>", "Package name")
    .option("--verbose", "Verbose objects (includes uuids)")
    .action((args) => CMDFN.packageReleasesList(ctx, args))
  // packageReleases
  //   .command("get")
  //   .description("Get information about a package release")
  //   .action((args) => CMDFN.packageReleasesGet(ctx, args))
  packageReleases
    .command("create")
    .description("Create a new package release")
    .option(
      "-p, --package-name-with-version <package_name_with_version>",
      "Package name and version",
    )
    .option("--package-name <package_name>", "Package name")
    .option("--release-version <release_version>", "Version to publish")
    .action((args) => CMDFN.packageReleasesCreate(ctx, args))
  packageReleases
    .command("update")
    .description("Update a package release")
    .option(
      "-p, --package-name-with-version <package_name_with_version>",
      "Package name and version",
    )
    .option("--is-latest", "Make package release the latest version")
    .option("--is-locked", "Lock the release")
    .action((args) => CMDFN.packageReleasesUpdate(ctx, args))

  const packageFiles = cmd
    .command("package_files")
    .description("Manage package release files")

  packageFiles
    .command("list")
    .description("List all files for a package release")
    .option(
      "--package-name-with-version <package_name_with_version>",
      "Package name with version",
    )
    .option(
      "--package-name <package_name>",
      "Package name (use latest version)",
    )
    .option("--package-release-id <package_release_id>", "Package Release Id")
    .action((args) => CMDFN.packageFilesList(ctx, args))
  // packageFiles.command("get").action((args) => CMDFN.packageFilesGet(ctx, args))
  packageFiles
    .command("download")
    .description("Download a file from a package release")
    .requiredOption(
      "--package-name-with-version <package_name_with_version>",
      "Package name and version",
    )
    .requiredOption("--remote-file-path <remote_file_path>", "Remote file path")
    .option(
      "--output <output>",
      "Output file path (optional), prints to stdout if not provided",
    )
    .action((args) => CMDFN.packageFilesDownload(ctx, args))
  packageFiles
    .command("create")
    .description("Create/upload a new package file")
    .option(
      "-p, --package-release-id <package_release_id>",
      "Package Release Id",
    )
    .option(
      "--package-name-with-version <package_name_with_version>",
      "Package name with version e.g. @tscircuit/arduino@1.2.3",
    )
    .requiredOption("--file <file>", "File to upload")
    .action((args) => CMDFN.packageFilesCreate(ctx, args))

  // packageFiles
  //   .command("upload-directory")
  //   .description("Upload a directory of files to a package release")
  //   .requiredOption("--dir <dir>", "Directory to upload")
  //   .action((args) => CMDFN.packageFilesUploadDirectory(ctx, args))

  const packageExamples = cmd
    .command("package_examples")
    .description("Manage package release examples")

  packageExamples
    .command("list")
    .description("List all examples for a package")
    .requiredOption("--package-name-with-version <package_name_with_version>")
    .action((args) => CMDFN.packageExamplesList(ctx, args))
  packageExamples
    .command("get")
    .description("Get information about a package example")
    .requiredOption("--package-example-id <package_example_id>")
    .action((args) => CMDFN.packageExamplesGet(ctx, args))
  packageExamples
    .command("create")
    .description("Create a new package example")
    .requiredOption("--package-name-with-version <package_name_with_version>")
    .requiredOption("--file <file>")
    .option("--export <export>", "Name of export to soupify")
    .action((args) => CMDFN.packageExamplesCreate(ctx, args))

  cmd
    .command("publish")
    .description("Publish a package release to the tscircuit registry")
    .option("--increment", "Increase patch version", true)
    .option("--patch", "Increase patch version")
    .option("--lock", "Lock the release after publishing to prevent changes")
    .action((args) => CMDFN.publish(ctx, args))

  cmd
    .command("version")
    .description("Print current version")
    .option("--show-latest", "Show latest versions of dependencies")
    .action((args) => CMDFN.version(ctx, args))

  cmd
    .command("login")
    .description("Authenticate CLI, login to registry")
    .action((args) => CMDFN.authLogin(ctx, args))
  cmd
    .command("logout")
    .description("Clear your local authentication")
    .action((args) => CMDFN.authLogout(ctx, args))

  const exportCmd = cmd
    .command("export")
    .description("Export Gerbers, Drill Files, Netlists and more")

  exportCmd
    .command("gerbers")
    .description("Export Gerber files from an example file")
    .option(
      "--file <file>",
      "Input example file (deprecated, use --input instead)",
    )
    .option("--input <input>", "Input example file")
    .option(
      "--export <export_name>",
      "Name of export to soupify, if not specified, soupify the default/only export",
    )
    .option("--outputfile <outputfile>", "Output file name", "gerbers.zip")
    .action((args) => CMDFN.exportGerbers(ctx, args))

  exportCmd
    .command("kicad_pcb")
    .description("Export KiCad PCB file from an example file")
    .option("--input <input>", "Input example file")
    .option(
      "--export <export_name>",
      "Name of export to soupify, if not specified, soupify the default/only export",
    )
    .option("--outputfile <outputfile>", "Output file name", "output.kicad_pcb")
    .action((args) => CMDFN.exportKicadPcb(ctx, args))

  exportCmd
    .command("pnp_csv")
    .description("Export Plug n Play CSV file from an example file")
    .option("--input <input>", "Input example file")
    .option(
      "--export <export_name>",
      "Name of export to soupify, if not specified, soupify the default/only export",
    )
    .option("--outputfile <outputfile>", "Output file name", "pnp.csv")
    .action((args) => CMDFN.exportPnpCsv(ctx, args))

  exportCmd
    .command("bom_csv")
    .description("Export BOM CSV file from an example file")
    .option("--input <input>", "Input example file")
    .option(
      "--export <export_name>",
      "Name of export to soupify, if not specified, soupify the default/only export",
    )
    .option("--outputfile <outputfile>", "Output file name", "bom.csv")
    .action((args) => CMDFN.exportBomCsv(ctx, args))

  cmd
    .command("soupify")
    .description("Convert an example file to tscircuit soup")
    .requiredOption("--file <file>", "Input example files")
    .option("--output <output.json>", "Output file")
    .option("--no-core", "Use @tscircuit/core to build (future version)", false)
    .option(
      "--export <export_name>",
      "Name of export to soupify, if not specified, soupify the default/only export",
    )
    .action((args) => CMDFN.soupify(ctx, args))

  cmd
    .command("install")
    .description("Install a package from the tscircuit registry")
    .argument(
      "<packages...>",
      "Packages to install from registry.tscircuit.com, optionally with version",
    )
    .option("-D, --dev", "Add to devDependencies")
    .action((packages, flags) => CMDFN.install(ctx, { packages, flags }))

  cmd
    .command("uninstall")
    .description("Uninstall a package")
    .argument("<packages...>", "Packages to uninstall")
    .action((packages, flags) => CMDFN.install(ctx, { packages, flags }))

  const devServerCmd = cmd
    .command("dev-server")
    .description("(Advanced) Manage the development server")

  devServerCmd
    .command("upload")
    .description("Upload a directory to the dev server")
    .option(
      "--dir <dir>",
      "Directory to upload (defaults to current directory)",
    )
    .option("-w, --watch", "Watch for changes")
    .option("-p, --port", "Port dev server is running on (default: 3020)")
    .action((args) => CMDFN.devServerUpload(ctx, args))

  devServerCmd
    .command("fulfill-export-requests")
    .action((args) => CMDFN.devServerFulfillExportRequests(ctx, args))

  cmd
    .command("open")
    .description("Open browser to package on tscircuit registry")
    .action((args) => CMDFN.open(ctx, args))

  function recursiveUnhelp(cmd: Command) {
    cmd.helpCommand(false)
    for (const c of cmd.commands) {
      recursiveUnhelp(c)
    }
  }
  recursiveUnhelp(cmd)

  return cmd
}
