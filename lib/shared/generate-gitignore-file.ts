import { writeFileIfNotExists } from "./write-file-if-not-exists"
import path from "node:path"

export const generateGitIgnoreFile = (dir: string) => {
  const gitignorePath = path.join(dir, ".gitignore")
  const gitignoreContent = `# Dependencies
node_modules/

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`

  writeFileIfNotExists(gitignorePath, gitignoreContent)
}
