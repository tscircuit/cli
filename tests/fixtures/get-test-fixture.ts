import tempy from "tempy"
import getPort from "get-port"

interface Params {
  vfs?: Record<string, string>
}

export const getTestFixture = async (params: Params) => {
  // Create temp directory
  const tempDirPath = await tempy.temporaryDirectory()
  const devServerPort = await getPort()

  // Write virtual filesystem files
  if (params.vfs) {
    for (const [filePath, content] of Object.entries(params.vfs)) {
      await Bun.write(`${tempDirPath}/${filePath}`, content)
    }
  }

  return {
    tempDirPath,
    devServerPort,
    devServerUrl: `http://localhost:${devServerPort}`,
  }
}
