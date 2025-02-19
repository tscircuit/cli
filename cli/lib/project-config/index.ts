import { cosmiconfigSync } from "cosmiconfig"

const explorer = cosmiconfigSync("tscircuit", {})

export const projectConfigSearchResult = explorer.search()
