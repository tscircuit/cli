import {
  getRegistryApiUrl,
  getSessionToken,
  getSessionTokenFromNpmrc,
} from "lib/cli-config"
import { nodeFilesystem } from "./node-filesystem"

type CircuitJsonToGltfFormat = "gltf" | "glb"

export const getCircuitJsonToGltfOptions = ({
  format = "gltf",
}: {
  format?: CircuitJsonToGltfFormat
}) => {
  const sessionToken = getSessionToken() ?? getSessionTokenFromNpmrc()

  return {
    format,
    projectBaseUrl: getRegistryApiUrl(),
    fs: nodeFilesystem,
    ...(sessionToken
      ? { authHeaders: { Authorization: `Bearer ${sessionToken}` } }
      : {}),
  }
}
