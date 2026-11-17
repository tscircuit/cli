import {
  addCircuithubProvider,
  removeCircuithubProvider,
} from "lib/circuithub/circuithub-provider"

type ProviderAction = (options: {
  log: (message: string) => void
}) => Promise<void>

/** Manufacturing providers `tsci auth add-provider` / `remove-provider` manage. */
export const PROVIDERS: Record<
  string,
  { add: ProviderAction; remove: ProviderAction }
> = {
  circuithub: {
    add: addCircuithubProvider,
    remove: removeCircuithubProvider,
  },
}

export const getProvider = (name: string) => PROVIDERS[name.toLowerCase()]

export const unknownProviderMessage = (name: string) =>
  `Unknown provider "${name}". Supported providers: ${Object.keys(PROVIDERS).join(", ")}.`
