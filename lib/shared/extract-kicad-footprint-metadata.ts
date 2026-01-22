import type { KicadFootprintMetadata } from "@tscircuit/props"

interface ReactElement {
  type: string | Function
  props?: {
    kicadFootprintMetadata?: KicadFootprintMetadata
    children?: ReactElement | ReactElement[]
    [key: string]: unknown
  }
}

interface ExtractKicadFootprintMetadataOptions {
  maxIterations?: number
  debug?: boolean
}

/**
 * Extracts kicadFootprintMetadata from a React component tree using BFS traversal.
 *
 * This function performs props introspection without rendering the component through
 * @tscircuit/core. It handles:
 * - Nested functional components (calls them to get their children)
 * - Multi-level component hierarchies
 * - Array and single children
 * - Components that fail to render (gracefully skipped)
 *
 * @param Component - The React component function to introspect
 * @param options - Configuration options
 * @returns The first kicadFootprintMetadata found, or an empty object if none found
 */
export function extractKicadFootprintMetadata(
  Component: (props?: any) => ReactElement,
  options: ExtractKicadFootprintMetadataOptions = {},
): KicadFootprintMetadata {
  const { maxIterations = 100, debug = false } = options

  let reactElm: ReactElement
  try {
    // Pass empty object as props to support components that destructure props
    // with default values (e.g., const { type = "default" } = props)
    reactElm = Component({})
  } catch (e) {
    if (debug) {
      console.log(
        `[extractKicadFootprintMetadata] Failed to call root component:`,
        e,
      )
    }
    return {}
  }

  if (!reactElm) {
    return {}
  }

  const queue: ReactElement[] = [reactElm]
  let iterations = 0

  while (queue.length > 0) {
    iterations++
    if (iterations > maxIterations) {
      if (debug) {
        console.log(
          `[extractKicadFootprintMetadata] Max iterations (${maxIterations}) reached`,
        )
      }
      break
    }

    const elm = queue.shift()
    if (!elm) continue

    // Handle nested functional components - call them to get their element tree
    if (typeof elm.type === "function") {
      try {
        // Try calling with props first (for components that need their props)
        let childElm: ReactElement | null = null
        try {
          childElm = (elm.type as Function)(elm.props || {})
        } catch {
          // If calling with props fails, try without props
          childElm = (elm.type as Function)()
        }
        if (childElm) {
          queue.push(childElm)
        }
      } catch (e) {
        // Expected for components that require specific props we can't provide
        if (debug) {
          console.log(
            `[extractKicadFootprintMetadata] Failed to call functional component:`,
            e,
          )
        }
      }
    }

    // Check for kicadFootprintMetadata in this element's props
    if (elm?.props?.kicadFootprintMetadata) {
      return elm.props.kicadFootprintMetadata
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

      // Also check other props that might contain React elements (like footprint prop)
      for (const [key, value] of Object.entries(elm.props)) {
        if (
          key !== "children" &&
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

  return {}
}
