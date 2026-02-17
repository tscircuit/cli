import {
  getRegistryApiUrl,
  getSessionToken,
  getSessionTokenFromNpmrc,
} from "lib/cli-config"

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
    ...(sessionToken
      ? { authHeaders: { Authorization: `Bearer ${sessionToken}` } }
      : {}),
  }
}
