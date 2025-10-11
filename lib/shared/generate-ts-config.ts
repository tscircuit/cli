import path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

// Generate a React-compatible tsconfig.json
export const generateTsConfig = (dir: string) => {
  const tsconfigPath = path.join(dir, "tsconfig.json")
  const tsconfigContent = JSON.stringify(
    {
      compilerOptions: {
        target: "ES6",
        module: "ESNext",
        jsx: "react-jsx",
        outDir: "dist",
        strict: true,
        esModuleInterop: true,
        moduleResolution: "node",
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        sourceMap: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
      },
    },
    null,
    2,
  )
  writeFileIfNotExists(tsconfigPath, tsconfigContent)
}
