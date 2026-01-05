import type { KyInstance } from "ky"
import type { EndpointResponse } from "lib/registry-api/endpoint-types"

/**
 * Checks if the current user has access to a given account (user or org)
 * @param ky - Ky instance with session token
 * @param orgTscircuitHandle - The tscircuit handle of the org to check
 * @returns true if the user has access, false otherwise
 */
export const checkOrgAccess = async (
  ky: KyInstance,
  orgTscircuitHandle: string,
): Promise<boolean> => {
  try {
    const { org } = await ky
      .post<EndpointResponse["orgs/get"]>("orgs/get", {
        json: { tscircuit_handle: orgTscircuitHandle },
      })
      .json()
    return org.user_permissions?.can_manage_org ?? false
  } catch {
    return false
  }
}
