//import {MachineContactTypes} from "lib/src/globals'
import { MachinePinOrContact } from "./MachinePinContactBuilder"
import {
  MachinePinTypes,
  MachineContactTypes,
  MachinePinOrContactTypes,
  MachinePinContactSizes,
  mpcFormat,
  mpcParameters,
} from "./globals"

export interface MachineContactProps {
  //size: "Medium" | "Large"
  //length: "Standard" | "Short"
  type: MachineContactTypes
  portHints?: string[]
  pcbX?: number | string
  pcbY?: number | string
  name: string
}

export type SpecificMachineContactProps = Omit<
  MachineContactProps,
  /*"size" | "length" |*/ "type"
>

export const MachineContact = (props: MachineContactProps) => {
  const {
    type = "MachineContactMedium",
    portHints = [],
    pcbX = 0,
    pcbY = 0,
    name = "MC1",
  } = props

  if (!props.type) {
    throw new Error(`Could not find contact type for: ${props.type}`)
  }

  return <MachinePinOrContact pinOrContactType={props.type} {...props} />
}
