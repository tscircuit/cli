import { existsSync } from "node:fs"
import path from "node:path"

export const rethrowProjectDependencyError = (
  error: unknown,
  projectDir: string,
): never => {
  if (
    !(error instanceof Error) ||
    !/^Cannot find (?:module|package) ['"](?:react(?:\/jsx(?:-dev)?-runtime)?|tscircuit)['"]/.test(
      error.message,
    )
  ) {
    throw error
  }

  let directory = path.resolve(projectDir)
  while (!existsSync(path.join(directory, "package.json"))) {
    const parent = path.dirname(directory)
    if (parent === directory) {
      throw new Error(
        `${error.message}\nRun "tsci init --yes" in ${path.resolve(projectDir)} to initialize the project and install its dependencies.`,
        { cause: error },
      )
    }
    directory = parent
  }

  throw new Error(
    `${error.message}\nRun "tsci install" in ${directory} to install the project's dependencies. Ensure the project includes tscircuit and react.`,
    { cause: error },
  )
}
