import type { CircuithubPart, CircuithubPartSearch } from "./circuithub-api"

export interface CircuithubBomRow {
  referenceDesignators: string[]
  manufacturer: string
  mpn: string
  supplier: string
  supplierPartNumber: string
  value: string
}

type SourceComponent = {
  type: "source_component"
  source_component_id: string
  name: string
  ftype?: string
  manufacturer_part_number?: string
  supplier_part_numbers?: Partial<Record<string, string[]>>
  do_not_place?: boolean
  footprint_variant?: string
  display_value?: string
  display_resistance?: string
  display_capacitance?: string
  display_inductance?: string
}

const SUPPLIER_NAMES: [key: string, name: string][] = [
  ["digikey", "Digi-Key"],
  ["mouser", "Mouser"],
]

/** CircuitHub reads the CSV as ASCII; spell units the way BOMs usually do. */
const toAsciiValue = (value: string) =>
  value
    .replace(/Ω/g, "")
    .replace(/[µμ]/g, "u")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true })

/**
 * Group the board's placed parts into BOM lines, one per MPN. Bare copper
 * test pads and parts marked do-not-place have nothing to assemble and are
 * left out; parts without an MPN get a line of their own so CircuitHub
 * shows them as needing a part.
 */
export const getCircuithubBomRows = (
  circuitJson: unknown[],
): CircuithubBomRow[] => {
  const placedComponentIds = new Set(
    circuitJson
      .filter((element: any) => element?.type === "pcb_component")
      .map((element: any) => element.source_component_id),
  )
  const rows = new Map<string, CircuithubBomRow>()
  for (const element of circuitJson as SourceComponent[]) {
    if (element?.type !== "source_component") continue
    if (!placedComponentIds.has(element.source_component_id)) continue
    if (element.do_not_place) continue
    if (
      element.ftype === "simple_test_point" &&
      element.footprint_variant === "pad"
    ) {
      continue
    }
    const mpn = element.manufacturer_part_number?.trim() ?? ""
    const value = toAsciiValue(
      element.display_value ??
        element.display_resistance ??
        element.display_capacitance ??
        element.display_inductance ??
        "",
    )
    const key = mpn ? `mpn:${mpn}` : `ref:${element.name}`
    const existing = rows.get(key)
    if (existing) {
      existing.referenceDesignators.push(element.name)
      continue
    }
    const [supplier, supplierPartNumber] = SUPPLIER_NAMES.map(
      ([supplierKey, supplierName]) =>
        [
          supplierName,
          element.supplier_part_numbers?.[supplierKey]?.[0],
        ] as const,
    ).find(([, partNumber]) => partNumber) ?? ["", ""]
    rows.set(key, {
      referenceDesignators: [element.name],
      manufacturer: "",
      mpn,
      supplier: supplierPartNumber ? supplier : "",
      supplierPartNumber: supplierPartNumber ?? "",
      value,
    })
  }
  for (const row of rows.values()) {
    row.referenceDesignators.sort(naturalCompare)
  }
  return [...rows.values()]
}

/**
 * Pick the manufacturer CircuitHub should use for an MPN. The same MPN is
 * often listed under several manufacturer spellings (or by a second source,
 * like SMAJ12A from Littelfuse and Vishay); prefer the listing with stock.
 */
export const pickCircuithubManufacturer = (
  mpn: string,
  search: CircuithubPartSearch,
): CircuithubPart | null => {
  const exact = (search.exactMatches ?? []).filter(
    (part) => part.mpn.toLowerCase() === mpn.toLowerCase(),
  )
  if (exact.length === 0) return null
  return [...exact].sort((a, b) => (b.available ?? 0) - (a.available ?? 0))[0]!
}

/**
 * Fill in the Manufacturer column from CircuitHub's part search. Without it
 * CircuitHub can't choose between same-MPN listings and leaves the line
 * unresolved (a `part_not_chosen` quote blocker).
 */
export const resolveCircuithubManufacturers = async (
  rows: CircuithubBomRow[],
  searchParts: (query: string) => Promise<CircuithubPartSearch>,
  onProgress?: (done: number, total: number) => void,
) => {
  const unresolved: string[] = []
  const withMpn = rows.filter((row) => row.mpn)
  let done = 0
  for (const row of withMpn) {
    const match = pickCircuithubManufacturer(
      row.mpn,
      await searchParts(row.mpn),
    )
    if (match) row.manufacturer = match.manufacturer
    else unresolved.push(row.mpn)
    onProgress?.(++done, withMpn.length)
  }
  return { unresolved }
}

const csvCell = (text: string) =>
  /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text

/** CircuitHub's documented BOM columns. */
export const formatCircuithubBomCsv = (rows: CircuithubBomRow[]) =>
  [
    [
      "Reference Designators",
      "Manufacturer",
      "Manufacturer Part Number",
      "Supplier",
      "Supplier Part Number",
      "Value",
    ],
    ...rows.map((row) => [
      row.referenceDesignators.join(","),
      row.manufacturer,
      row.mpn,
      row.supplier,
      row.supplierPartNumber,
      row.value,
    ]),
  ]
    .map((cells) => cells.map(csvCell).join(","))
    .join("\n")
    .concat("\n")
