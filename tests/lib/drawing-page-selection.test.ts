import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  getDrawingPages,
  selectDrawingPages,
} from "lib/shared/render-drawing-pages"
import { resolveBuildOptions } from "cli/build/resolve-build-options"

test("drawing selection handles safe filenames, ambiguity and build config", () => {
  const pages: AnyCircuitElement[] = [
    {
      type: "drawing_page",
      drawing_page_id: "one",
      name: "Housing plan",
      width: 80,
      height: 60,
    },
    { type: "drawing_page", drawing_page_id: "two", width: 80, height: 60 },
  ]
  expect(getDrawingPages(pages).map((p) => p.fileName)).toEqual([
    "Housing-plan.svg",
    "drawing-2.svg",
  ])
  expect(selectDrawingPages(pages, "Housing plan")[0]!.fileName).toBe(
    "Housing-plan.svg",
  )
  expect(
    selectDrawingPages(pages, "drawing-2.svg")[0]!.page.drawing_page_id,
  ).toBe("two")
  const duplicate = [
    pages[0]!,
    { ...pages[0]!, drawing_page_id: "duplicate" },
  ] as AnyCircuitElement[]
  expect(() => selectDrawingPages(duplicate, "Housing plan")).toThrow(
    "ambiguous",
  )
  expect(() => selectDrawingPages(duplicate)).toThrow("collide")
  const unsafe = [
    { ...pages[0]!, name: "../../inspection" },
  ] as AnyCircuitElement[]
  expect(getDrawingPages(unsafe)[0]!.fileName).not.toContain("/")
  const { options } = resolveBuildOptions({
    projectConfig: { build: { drawings: true, drawing: "Housing plan" } },
    cliOptions: { drawing: "drawing-2.svg" },
  })
  expect(options.drawings).toBe(true)
  expect(options.drawing).toBe("drawing-2.svg")
})
