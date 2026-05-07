import fs from "node:fs"
import path from "node:path"

export type InlineBuildFile = {
  filePath: string
  cleanup: () => void
}

export const createInlineBuildFile = ({
  code,
  projectDir,
}: {
  code: string
  projectDir: string
}): InlineBuildFile => {
  const filePath = path.join(
    projectDir,
    `.tsci-inline-build-${process.pid}-${Date.now()}.circuit.tsx`,
  )

  fs.writeFileSync(filePath, code)

  return {
    filePath,
    cleanup: () => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    },
  }
}
