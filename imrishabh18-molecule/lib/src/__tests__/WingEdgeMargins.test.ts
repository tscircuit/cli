// Test wing edge margin functionality
import { describe, test, expect } from "bun:test"
import { calculateMolecule } from "../MoleculeCalculator"

describe("Wing Edge Margins", () => {
  test("no wings - no wing edge margins created", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
    })

    // Should only have the 5 basic margins: left, right, top, bottom, center
    expect(result.margins.length).toBe(5)
    expect(result.margins.some((m) => m.name.includes("Corner"))).toBe(false)
  })

  test("uniform wings - creates all 8 wing edge margins", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wing: "3mm",
    })

    // Should have 5 basic margins + 4 wing area margins + 8 wing edge margins + 4 diagonal corners = 21 total
    expect(result.margins.length).toBe(21)

    // Check all 8 wing edge margins exist
    const wingMarginNames = [
      "topLeftCorner_Up",
      "topRightCorner_Up",
      "bottomLeftCorner_Down",
      "bottomRightCorner_Down",
      "topLeftCorner_Left",
      "bottomLeftCorner_Left",
      "topRightCorner_Right",
      "bottomRightCorner_Right",
    ]

    wingMarginNames.forEach((name) => {
      expect(result.margins.some((m) => m.name === name)).toBe(true)
    })
  })

  test("only wingTop - creates only top wing edge margins", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingTop: "4mm",
    })

    // Should have 5 basic margins + 1 top wing area margin + 2 top wing edges = 8 total
    expect(result.margins.length).toBe(8)

    // Check only top wing edges exist
    expect(result.margins.some((m) => m.name === "topLeftCorner_Up")).toBe(true)
    expect(result.margins.some((m) => m.name === "topRightCorner_Up")).toBe(
      true,
    )

    // Check bottom/left/right wing edges don't exist
    expect(result.margins.some((m) => m.name === "bottomLeftCorner_Down")).toBe(
      false,
    )
    expect(result.margins.some((m) => m.name === "topLeftCorner_Left")).toBe(
      false,
    )
  })

  test("only wingLeft - creates only left wing edge margins", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingLeft: "3mm",
    })

    // Should have 5 basic margins + 1 left wing area margin + 2 left wing edges = 8 total
    expect(result.margins.length).toBe(8)

    // Check only left wing edges exist
    expect(result.margins.some((m) => m.name === "topLeftCorner_Left")).toBe(
      true,
    )
    expect(result.margins.some((m) => m.name === "bottomLeftCorner_Left")).toBe(
      true,
    )

    // Check other wing edges don't exist
    expect(result.margins.some((m) => m.name === "topLeftCorner_Up")).toBe(
      false,
    )
    expect(result.margins.some((m) => m.name === "topRightCorner_Right")).toBe(
      false,
    )
  })

  test("asymmetric wings - creates margins only where wings exist", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingTop: "5mm",
      wingBottom: "2mm",
      wingLeft: "3mm",
      // wingRight not specified (defaults to 0)
    })

    // Should have 5 basic margins + 3 wing area margins + 6 wing edges (top 2 + bottom 2 + left 2) + 2 diagonal corners = 16 total
    expect(result.margins.length).toBe(16)

    // Check top, bottom, left wing edges exist
    expect(result.margins.some((m) => m.name === "topLeftCorner_Up")).toBe(true)
    expect(result.margins.some((m) => m.name === "bottomLeftCorner_Down")).toBe(
      true,
    )
    expect(result.margins.some((m) => m.name === "topLeftCorner_Left")).toBe(
      true,
    )

    // Check right wing edges don't exist
    expect(result.margins.some((m) => m.name === "topRightCorner_Right")).toBe(
      false,
    )
    expect(
      result.margins.some((m) => m.name === "bottomRightCorner_Right"),
    ).toBe(false)
  })

  test("wing edge margin dimensions - top wing", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingTop: "4mm",
    })

    const topLeftWing = result.margins.find(
      (m) => m.name === "topLeftCorner_Up",
    )
    const topRightWing = result.margins.find(
      (m) => m.name === "topRightCorner_Up",
    )

    // Wing edge margins should have height = wing amount (4mm)
    expect(topLeftWing?.height).toBe(4)
    expect(topRightWing?.height).toBe(4)

    // Width should equal contactSize (pinBoundingBoxOffsetX = 2 for medium pins)
    expect(topLeftWing?.width).toBe(2)
    expect(topRightWing?.width).toBe(2)
  })

  test("wing edge margin dimensions - left wing", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingLeft: "5mm",
    })

    const topLeftWing = result.margins.find(
      (m) => m.name === "topLeftCorner_Left",
    )
    const bottomLeftWing = result.margins.find(
      (m) => m.name === "bottomLeftCorner_Left",
    )

    // Wing edge margins should have width = wing amount (5mm)
    expect(topLeftWing?.width).toBe(5)
    expect(bottomLeftWing?.width).toBe(5)

    // Height should equal contactSize (pinBoundingBoxOffsetY = 2 for medium pins)
    expect(topLeftWing?.height).toBe(2)
    expect(bottomLeftWing?.height).toBe(2)
  })

  test("wing edge margin positions - top wing", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingTop: "4mm",
    })

    const topLeftWing = result.margins.find(
      (m) => m.name === "topLeftCorner_Up",
    )
    const topRightWing = result.margins.find(
      (m) => m.name === "topRightCorner_Up",
    )

    // boardNominalHeight = height + pinBoundingBoxOffsetY = 8 + 2 = 10mm
    // pcbY should be: boardNominalHeight/2 + wingTop/2 = 10/2 + 4/2 = 5 + 2 = 7mm
    expect(topLeftWing?.pcbY).toBe(7)
    expect(topRightWing?.pcbY).toBe(7)

    // X positions should be at edges of board (after pin bounding box), not at pin centers
    // For 8x8 relative: innerWidth = 10 - 2 = 8mm
    // Left edge: -innerWidth/2 = -4mm, Right edge: innerWidth/2 = 4mm
    expect(topLeftWing?.pcbX).toBe(-4)
    expect(topRightWing?.pcbX).toBe(4)
  })

  test("2pin molecule - only left and right wing edges", () => {
    const result = calculateMolecule({
      type: "2pin",
      size: "8x3 absolute",
      pinType: "MachinePinMediumShort",
      wingLeft: "2mm",
      wingRight: "2mm",
    })

    // Should have 1 center margin + 2 wing area margins + 2 wing edges = 5 total
    expect(result.margins.length).toBe(5)

    // Check left and right wing edges exist
    expect(result.margins.some((m) => m.name === "topLeftCorner_Left")).toBe(
      true,
    )
    expect(result.margins.some((m) => m.name === "topRightCorner_Right")).toBe(
      true,
    )

    // Check no Up/Down wing edges (2pin is horizontal)
    expect(result.margins.some((m) => m.name.includes("_Up"))).toBe(false)
    expect(result.margins.some((m) => m.name.includes("_Down"))).toBe(false)
  })

  test("large pins - wing edge contact size should match pin size", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "16x16",
      pinType: "MachinePinLargeStandard",
      wing: "8mm", // Must be >= 6mm for large pins
    })

    const topLeftWing = result.margins.find(
      (m) => m.name === "topLeftCorner_Up",
    )

    // Large pins have pinBoundingBoxOffsetX = 6
    expect(topLeftWing?.width).toBe(6)
    expect(topLeftWing?.height).toBe(8) // Wing amount
  })

  test("wing edge margins appear after basic margins in array", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wing: "3mm",
    })

    // First 5 should be basic margins
    const basicMarginNames = [
      "leftMargin",
      "rightMargin",
      "topMargin",
      "bottomMargin",
      "centerMargin",
    ]
    result.margins.slice(0, 5).forEach((margin) => {
      expect(basicMarginNames.includes(margin.name)).toBe(true)
    })

    // Next 4 should be wing area margins
    const wingAreaMarginNames = [
      "topWingMargin",
      "bottomWingMargin",
      "leftWingMargin",
      "rightWingMargin",
    ]
    result.margins.slice(5, 9).forEach((margin) => {
      expect(wingAreaMarginNames.includes(margin.name)).toBe(true)
    })

    // Remaining should be wing edge margins
    result.margins.slice(9).forEach((margin) => {
      expect(margin.name.includes("Corner")).toBe(true)
    })
  })

  test("nominal wing does NOT create wing edge margins (too small)", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wing: "nominal", // 0.2mm - too small for wing area margins or edge contacts (need >= 2mm)
    })

    // Should only have 5 basic margins, no wing area margins or wing edge margins (0.2mm < 2mm)
    expect(result.margins.length).toBe(5)

    const topLeftWing = result.margins.find(
      (m) => m.name === "topLeftCorner_Up",
    )
    expect(topLeftWing).toBeUndefined()
  })

  test("wing edge margins require minimum 2mm wing size", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "8x8",
      pinType: "MachinePinMediumStandard",
      wingTop: "1mm", // Too small for wing area margins or edge contacts
    })

    // Should only have 5 basic margins, no wing area margins or wing edge margins (1mm < 2mm)
    expect(result.margins.length).toBe(5)
    expect(result.margins.some((m) => m.name === "topLeftCorner_Up")).toBe(
      false,
    )
  })

  test("wing edge large pins require minimum 6mm wing size", () => {
    const result = calculateMolecule({
      type: "4pin",
      size: "16x16",
      pinType: "MachinePinLargeStandard",
      wingTop: "4mm", // Too small for large pin contacts (need >= 6mm)
    })

    // Should have 5 basic margins + 1 wing area margin, no wing edge margins
    expect(result.margins.length).toBe(6)
    expect(result.margins.some((m) => m.name === "topLeftCorner_Up")).toBe(
      false,
    )
  })
})
