export default {
  platformConfig: {
    footprintLibraryMap: {
      ti: async () => {
        return {
          footprintCircuitJson: [
            {
              type: "source_component",
              source_component_id: "source_component_0",
              ftype: "simple_chip",
              name: "LM358",
            },
            {
              pcb_component_id: "pcb_component_0",
              type: "pcb_component",
              source_component_id: "source_component_0",
              center: { x: 0, y: 0 },
              width: 2,
              height: 2,
              layer: "top",
              rotation: 0,
              obstructs_within_bounds: true,
            },
            {
              type: "source_port",
              source_port_id: "source_port_0",
              source_component_id: "source_component_0",
              name: "pin1",
              pin_number: 1,
              port_hints: ["1"],
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              pcb_component_id: "pcb_component_0",
              shape: "rect",
              port_hints: ["1"],
              x: -0.6,
              y: 0,
              width: 0.5,
              height: 1,
              layer: "top",
              rotation: 0,
            },
          ],
          cadModel: [],
        }
      },
    },
  },
}
