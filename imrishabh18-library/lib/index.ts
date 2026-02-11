// export * from "lib/adom-footprint-library"
import packageJson from "../package.json"

export * from "lib/adom-footprint-library"

export { MachinePin } from "lib/src/MachinePin"
export { MachineContact } from "lib/src/MachineContact"

export type { MachinePinProps } from "lib/src/MachinePin"
export type { MachineContactProps } from "lib/src/MachineContact"

export type { MachinePinTypes, MachineContactTypes } from "lib/src/globals"
export { MachinePinContactSizes } from "lib/src/globals"

export const libraryVersion = packageJson.version
