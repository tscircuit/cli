import { MachinePin } from "lib/src/MachinePin"
import { MachineContact } from "lib/src/MachineContact"

import packageJson from "./package.json"

export default () => (
  <board width="30mm" height="24mm">
    <silkscreenrect pcbX={0} pcbY={5} width={28} height={11} />
    <silkscreenrect pcbX={0} pcbY={-5} width={28} height={9} />

    <silkscreentext //silkscreentext
      pcbX={0}
      pcbY={10}
      anchorAlignment="center"
      fontSize={1}
      text={"Machine Pins"}
    />

    <silkscreentext //silkscreentext
      pcbX={-10}
      pcbY={9}
      anchorAlignment="center"
      fontSize={0.6}
      text={"MediumShort"}
    />
    <MachinePin type="MachinePinMediumShort" name="MP1" pcbX="-10" pcbY="5" />

    <silkscreentext //silkscreentext
      pcbX={-3}
      pcbY={9}
      anchorAlignment="center"
      fontSize={0.6}
      text={"MediumStandard"}
    />
    <MachinePin type="MachinePinMediumStandard" name="MP2" pcbX="-3" pcbY="5" />

    <silkscreentext //silkscreentext
      pcbX={3}
      pcbY={9}
      anchorAlignment="center"
      fontSize={0.6}
      text={"LargeShort"}
    />
    <MachinePin type="MachinePinLargeShort" name="MP3" pcbX="3" pcbY="5" />

    <silkscreentext //silkscreentext
      pcbX={10}
      pcbY={9}
      anchorAlignment="center"
      fontSize={0.6}
      text={"LargeStandard"}
    />
    <MachinePin type="MachinePinLargeStandard" name="MP4" pcbX="10" pcbY="5" />

    <silkscreentext //silkscreentext
      pcbX={0}
      pcbY={-1}
      anchorAlignment="center"
      fontSize={1}
      text={"Machine Contacts"}
    />

    <silkscreentext //silkscreentext
      pcbX={-6.5}
      pcbY={-2}
      anchorAlignment="center"
      fontSize={0.6}
      text={"Medium"}
    />
    <MachineContact
      type="MachineContactMedium"
      name="MC1"
      pcbX="-6.5"
      pcbY="-5"
    />

    <silkscreentext //silkscreentext
      pcbX={6.5}
      pcbY={-2}
      anchorAlignment="center"
      fontSize={0.6}
      text={"Large"}
    />
    <MachineContact
      type="MachineContactLarge"
      name="MC2"
      pcbX="6.5"
      pcbY="-5"
    />

    <silkscreentext //silkscreentext
      pcbX={0}
      pcbY={-9}
      anchorAlignment="center"
      fontSize={0.6}
      text={`Library version: ${packageJson.version}`}
    />
  </board>
)
