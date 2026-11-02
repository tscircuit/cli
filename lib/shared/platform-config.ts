import type { getPlatformConfig } from "tscircuit"

// Keep callbacks aligned with the schema version owned by the runtime.
export type PlatformConfig = ReturnType<typeof getPlatformConfig>
