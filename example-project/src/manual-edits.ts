/**
 * DO NOT EDIT THIS FILE DIRECTLY!
 *
 * This file is automatically edited when running `tsci dev` and dragging things
 * around. `tsci dev` searches for a file named "*.manual-edits.ts" and edits
 * it when you e.g. move a footprint. If there are multiple files, it'll try
 * to pick one based on context or ask.
 *
 * If you're not running `tsci dev`, you can safely edit this file.
 */
export default {
  // Generated when this file is created, this unique identifier is used to help
  // determine which file to edit when there are many *.manual-edits.ts files
  manual_edit_id: "abcdef",

  // Manual pcb placements, added when you drag a footprint
  pcb_placements: [
    {
      _edit_event_id: "0.6668756126702717",
      selector: ".U2",
      center: {
        x: -5.830346475507767,
        y: -1.3620071684587813,
      },
      relative_to: "group_center",
    },
    {
      _edit_event_id: "0.867524742177592",
      selector: ".R1",
      center: {
        x: 3.679808841099163,
        y: 3.6320191158900847,
      },
      relative_to: "group_center",
    },
    {
      _edit_event_id: "0.4555106760070762",
      selector: ".C1",
      center: {
        x: 0,
        y: 2.6666666666666665,
      },
      relative_to: "group_center",
    },
    {
      _edit_event_id: "0.6123290063979561",
      selector: ".R2",
      center: {
        x: 13.457749922536511,
        y: 5.576084911465589,
      },
      relative_to: "group_center",
    },
  ],
  manual_trace_hints: [
    {
      pcb_port_selector: ".D9 > .pin2",
      offsets: [
        {
          x: 17.58431693903126,
          y: 15.875996800068524,
          via: false,
        },
        {
          x: 18.01072486303387,
          y: 2.621817162320708,
          via: false,
        },
        {
          x: 23.127619951065203,
          y: 2.4441471939862858,
          via: false,
        },
      ],
    },
    {
      pcb_port_selector: ".D4 > .pin2",
      offsets: [
        {
          x: -21.94914509505002,
          y: -3.063375950444515,
          via: true,
        },
        {
          x: -16.627383568380463,
          y: -3.006761466118242,
          via: true,
        },
      ],
    },
  ],
  edit_events: [],
}
