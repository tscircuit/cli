import path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

// Generate a React-compatible tsconfig.json
export const generateTsConfig = (dir: string) => {
  const tsconfigPath = path.join(dir, "tsconfig.json")
  const tsconfigContent = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        jsx: "react-jsx",
        outDir: "dist",
        rootDir: ".",
        baseUrl: ".",
        strict: true,
        esModuleInterop: true,
        moduleResolution: "node",
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        sourceMap: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        types: ["tscircuit"],
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules", "dist"],
    },
    null,
    2,
  )
  writeFileIfNotExists(tsconfigPath, tsconfigContent)
}
