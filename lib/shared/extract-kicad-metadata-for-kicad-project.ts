import type {
  KicadFootprintMetadata,
  KicadSymbolMetadata,
} from "@tscircuit/props"

interface ReactElement {
  type: string | Function
  props?: {
    kicadFootprintMetadata?: KicadFootprintMetadata
    kicadSymbolMetadata?: KicadSymbolMetadata
    children?: ReactElement | ReactElement[]
    [key: string]: unknown
  }
}

interface ExtractKicadMetadataForKicadProjectOptions {
  maxIterations?: number
  debug?: boolean
}

interface ExtractKicadMetadataForKicadProjectResult {
  footprintMetadataMap: Map<string, KicadFootprintMetadata>
  symbolMetadataMap: Map<string, KicadSymbolMetadata>
}

/**
 * Extracts RefDes prefix (letters only) from a name like "MC1", "MP_Med2", etc.
 */
function extractRefDesPrefix(name: string): string {
  // Extract leading letters, handling underscores (e.g., "MC_Med1" -> "MC")
  const match = name.match(/^([A-Za-z]+)/)
  return match ? match[1] : ""
}

/**
 * Extracts RefDes prefix from metadata's properties.Reference.value
 */
function getRefDesPrefixFromMetadata(
  metadata: KicadFootprintMetadata | KicadSymbolMetadata,
): string | null {
  if (metadata && typeof metadata === "object" && "properties" in metadata) {
    const props = metadata.properties as Record<string, unknown>
    if (
      props?.Reference &&
      typeof props.Reference === "object" &&
      props.Reference !== null
    ) {
      const ref = props.Reference as { value?: string }
      if (ref.value && typeof ref.value === "string") {
        // Remove trailing asterisks like "MP**" -> "MP"
        const cleaned = ref.value.replace(/\*+$/, "")
        // Extract just the letters prefix (e.g., "MC1" -> "MC", "MC_Med1" -> "MC")
        return extractRefDesPrefix(cleaned)
      }
    }
  }
  return null
}

/**
 * Extracts all kicadFootprintMetadata and kicadSymbolMetadata from a board/circuit component
 * for use in KiCad project generation. Returns maps keyed by RefDes prefix.
 *
 * This function performs BFS traversal and props introspection without rendering
 * the component through @tscircuit/core. It handles:
 * - Nested functional components (calls them to get their children)
 * - Multi-level component hierarchies
 * - Array and single children
 * - Components that fail to render (gracefully skipped)
 *
 * @param Component - The board/circuit component function to introspect
 * @param options - Configuration options
 * @returns Maps of RefDes prefix to metadata for use by circuit-json-to-kicad
 */
export function extractKicadMetadataForKicadProject(
  Component: (props?: any) => ReactElement,
  options: ExtractKicadMetadataForKicadProjectOptions = {},
): ExtractKicadMetadataForKicadProjectResult {
  const { maxIterations = 1000, debug = false } = options

  const footprintMetadataMap = new Map<string, KicadFootprintMetadata>()
  const symbolMetadataMap = new Map<string, KicadSymbolMetadata>()

  let reactElm: ReactElement
  try {
    reactElm = Component({})
  } catch (e) {
    if (debug) {
      console.log(
        `[extractKicadMetadataForKicadProject] Failed to call root component:`,
        e,
      )
    }
    return { footprintMetadataMap, symbolMetadataMap }
  }

  if (!reactElm) {
    return { footprintMetadataMap, symbolMetadataMap }
  }

  const queue: ReactElement[] = [reactElm]
  let iterations = 0

  while (queue.length > 0) {
    iterations++
    if (iterations > maxIterations) {
      if (debug) {
        console.log(
          `[extractKicadMetadataForKicadProject] Max iterations (${maxIterations}) reached`,
        )
      }
      break
    }

    const elm = queue.shift()
    if (!elm) continue

    // Handle nested functional components - call them to get their element tree
    if (typeof elm.type === "function") {
      try {
        let childElm: ReactElement | null = null
        try {
          childElm = (elm.type as Function)(elm.props || {})
        } catch {
          childElm = (elm.type as Function)()
        }
        if (childElm) {
          queue.push(childElm)
        }
      } catch (e) {
        if (debug) {
          console.log(
            `[extractKicadMetadataForKicadProject] Failed to call functional component:`,
            e,
          )
        }
      }
    }

    // Check for kicadFootprintMetadata in this element's props
    if (elm?.props?.kicadFootprintMetadata) {
      const metadata = elm.props.kicadFootprintMetadata
      const prefix = getRefDesPrefixFromMetadata(metadata)
      if (prefix && !footprintMetadataMap.has(prefix)) {
        footprintMetadataMap.set(prefix, metadata)
        if (debug) {
          console.log(
            `[extractKicadMetadataForKicadProject] Found footprint metadata for prefix: ${prefix}`,
          )
        }
      }
    }

    // Check for kicadSymbolMetadata in this element's props
    if (elm?.props?.kicadSymbolMetadata) {
      const metadata = elm.props.kicadSymbolMetadata
      const prefix = getRefDesPrefixFromMetadata(metadata)
      if (prefix && !symbolMetadataMap.has(prefix)) {
        symbolMetadataMap.set(prefix, metadata)
        if (debug) {
          console.log(
            `[extractKicadMetadataForKicadProject] Found symbol metadata for prefix: ${prefix}`,
          )
        }
      }
    }

    // Process children - add them to the queue
    if (elm?.props) {
      const children = elm.props.children
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child && typeof child === "object") {
            queue.push(child as ReactElement)
          }
        }
      } else if (children && typeof children === "object") {
        queue.push(children as ReactElement)
      }

      // Also check other props that might contain React elements
      for (const [key, value] of Object.entries(elm.props)) {
        if (
          key !== "children" &&
          key !== "kicadFootprintMetadata" &&
          key !== "kicadSymbolMetadata" &&
          value &&
          typeof value === "object" &&
          "type" in (value as object) &&
          "props" in (value as object)
        ) {
          queue.push(value as ReactElement)
        }
      }
    }
  }

  return {
    footprintMetadataMap,
    symbolMetadataMap,
  }
}
