import Configstore from "configstore"

interface ProfileConfigProps {
  session_token?: string
  registry_url?: string
}

interface GlobalConfigProps {
  current_profile?: string
  log_requests?: boolean
  runtime?: "bun" | "node"
}

interface TypedConfigstore<T extends Record<string, any>> {
  /**
   * Get the path to the config file. Can be used to show the user
   * where it is, or better, open it for them.
   */
  path: string

  /**
   * Get all items as an object or replace the current config with an object.
   */
  all: any

  /**
   * Get the item count
   */
  size: number

  /**
   * Get an item
   * @param key The string key to get
   * @return The contents of the config from key $key
   */
  get(key: keyof T): any

  /**
   * Set an item
   * @param key The string key
   * @param val The value to set
   */
  set<K extends keyof T>(key: K, val: T[K]): void

  /**
   * Determines if a key is present in the config
   * @param key The string key to test for
   * @return True if the key is present
   */
  has(key: keyof T): boolean

  /**
   * Delete an item.
   * @param key The key to delete
   */
  delete(key: keyof T): void

  /**
   * Clear the config.
   * Equivalent to <code>Configstore.all = {};</code>
   */
  clear(): void
}

export interface ContextConfigProps {
  profile_config: TypedConfigstore<ProfileConfigProps>
  global_config: TypedConfigstore<GlobalConfigProps>
  current_profile: string
}

export const createConfigHandler = ({
  profile,
}: {
  profile?: string
}): ContextConfigProps => {
  const global_config: TypedConfigstore<GlobalConfigProps> = new Configstore(
    "tsci",
  )
  const current_profile =
    profile ?? global_config.get("current_profile") ?? "default"

  const profile_config: TypedConfigstore<ProfileConfigProps> = {
    get: (key: string) =>
      (global_config as any).get(`profiles.${current_profile}.${key}`),
    set: (key: string, value: any) =>
      (global_config as any).set(`profiles.${current_profile}.${key}`, value),
    clear: () => {
      for (const key of Object.keys(global_config.all)) {
        if (key.startsWith(`profiles.${current_profile}`)) {
          global_config.delete(key as any)
        }
      }
    },
  } as any

  return { profile_config, global_config, current_profile }
}
