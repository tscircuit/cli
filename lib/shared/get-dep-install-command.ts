export const getGlobalDepsInstallCommand = (
  packageManager: string,
  deps: string,
): string => {
  switch (packageManager) {
    case "yarn":
      return `yarn global add ${deps}`
    case "pnpm":
      return `pnpm add -g ${deps}`
    case "bun":
      return `bun install -g ${deps}`
    default:
      return `npm install -g ${deps}`
  }
}
