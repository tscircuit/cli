import * as path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

export const generatePackageJson = (dir: string) => {
    const packageJsonPath = path.join(dir, "package.json")
    const packageJsonContent = {
        name: path.basename(dir),
        version: "1.0.0",
        description: "A TSCircuit project",
        main: "index.tsx",
        keywords: ["tscircuit", "electronics"],
        scripts: {
            dev: "tsci dev",
            build: "tsci build",
        },
    }

    writeFileIfNotExists(
        packageJsonPath,
        JSON.stringify(packageJsonContent, null, 2),
    )
}
