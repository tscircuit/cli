import { expect, test } from "bun:test"
import { formatAutorouterDebugEvent } from "lib/dev/DevServer"

test("dev autorouter debug events omit circuit JSON ids", () => {
  const output = formatAutorouterDebugEvent({
    event_type: "autorouting:progress",
    subcircuit_id: "subcircuit_source_group_0",
    componentDisplayName: "board main",
    phase: "capacity-depth",
    steps: 12,
    progress: 0.25,
    simpleRouteJson: {
      connections: [
        {
          name: "source_net_0",
          source_trace_id: "source_trace_0",
        },
      ],
    },
    error: {
      message: "Could not route source_trace_1 to source_net_0",
    },
  })

  expect(output).toContain("component=board main")
  expect(output).toContain("phase=capacity-depth")
  expect(output).toContain("steps=12")
  expect(output).toContain("progress=25%")
  expect(output).toContain(
    "error=Could not route internal element to internal element",
  )
  expect(output).not.toMatch(
    /source_(?:trace|net)_\d+|subcircuit_source_group_\d+/,
  )
})
