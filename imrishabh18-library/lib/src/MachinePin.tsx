import { MachinePinOrContact } from "./MachinePinContactBuilder"
import {
  MachinePinTypes,
  MachineContactTypes,
  MachinePinOrContactTypes,
  MachinePinContactSizes,
  mpcFormat,
  mpcParameters,
} from "./globals"

export interface MachinePinProps {
  //size: "Medium" | "Large"
  //length: "Standard" | "Short"
  type: MachinePinTypes
  portHints?: string[]
  pcbX?: number | string
  pcbY?: number | string
  name: string
}
/*
  export interface MachinePinPropsWithName extends MachinePinPropsBasics {
    pinType: MachinePinTypes,
    size?: never,
    length?: never,
  
  }
  export interface MachinePinPropsWithSpecs extends MachinePinPropsBasics {
    pinType?: never,
    size: "Medium" | "Large" , 
    length: "Standard" | "Short"
  
  }
  */
//export type MachinePinProps = MachinePinPropsWithName | MachinePinPropsWithSpecs

export type SpecificMachinePinProps = Omit<
  MachinePinProps,
  /*"size" | "length" |*/ "type"
>

export const MachinePin = (props: MachinePinProps) => {
  const {
    type = "MachinePinMediumStandard",
    portHints = [],
    pcbX = 0,
    pcbY = 0,
    name = "MP1",
  } = props

  if (!props.type) {
    throw new Error(`Could not find pin type for: ${props.type}`)
  }

  return <MachinePinOrContact pinOrContactType={props.type} {...props} />
}
