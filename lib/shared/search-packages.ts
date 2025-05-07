import { getRegistryApiKy } from "../registry-api/get-ky"

export interface PackageInfo {
  name: string
  description?: string
  version?: string
  author?: string
}

export async function searchPackages(query: string): Promise<PackageInfo[]> {
  const ky = getRegistryApiKy()
  try {
    const response = await ky
      .post<{ packages: PackageInfo[] }>("packages/search", {
        json: { query },
      })
      .json()
    return response.packages
  } catch (error) {
    console.error("Failed to search packages:", error)
    return []
  }
}
