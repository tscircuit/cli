import type { KyInstance } from "ky"
import type { EndpointResponse } from "lib/registry-api/endpoint-types"

/**
 * Checks if the current user has access to a given account (user or org)
 * @param ky - Ky instance with session token
 * @param accountName - The github username or org name to check
 * @returns true if the user has access, false otherwise
 */
export const checkOrgAccess = async (
  ky: KyInstance,
  accountName: string,
): Promise<boolean> => {
  try {
    const { org } = await ky
      .get<EndpointResponse["orgs/get"]>(`orgs/get?org_name=${accountName}`)
      .json()
    return org.user_permissions?.can_manage_org ?? false
  } catch {
    return false
  }
}
