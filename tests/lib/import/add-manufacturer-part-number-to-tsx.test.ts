import { expect, test } from "bun:test"
import ts from "typescript"
import { addManufacturerPartNumberToTsx } from "lib/import/add-manufacturer-part-number-to-tsx"

test("sets the raw manufacturer MPN on chip and passive imports, preserving alias overrides", () => {
  for (const tag of ["chip", "resistor", "capacitor", "diode"]) {
    for (const propsName of ["props", "restProps"]) {
      const source = `export const Part = (${propsName}: any) => <${tag} manufacturerPartNumber="OLD" {...${propsName}} />`
      const result = addManufacturerPartNumberToTsx(source, ' RAW-"MPN"\\123 ')
      const js = ts.transpileModule(result, {
        compilerOptions: {
          jsx: ts.JsxEmit.React,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText
      const module = { exports: {} as any }
      new Function("React", "module", "exports", js)(
        { createElement: (_tag: string, props: any) => props },
        module,
        module.exports,
      )
      expect(module.exports.Part({}).mpn).toBe('RAW-"MPN"\\123')
      expect(module.exports.Part({}).manufacturerPartNumber).toBe(
        module.exports.Part({}).mpn,
      )
      for (const alias of ["mpn", "mfn", "manufacturerPartNumber"]) {
        expect(
          module.exports.Part({ [alias]: "OVERRIDE" }).manufacturerPartNumber,
        ).toBe("OVERRIDE")
        expect(module.exports.Part({ [alias]: "OVERRIDE" }).mpn).toBe(
          "OVERRIDE",
        )
      }
      expect(result).not.toContain('manufacturerPartNumber="OLD"')
    }
  }
})

test("does not manufacture an MPN when EasyEDA metadata is missing", () => {
  const source = '<chip name="C123" {...props} />'
  expect(addManufacturerPartNumberToTsx(source, undefined)).toBe(source)
  expect(addManufacturerPartNumberToTsx(source, " ")).toBe(source)
  expect(() => addManufacturerPartNumberToTsx(source, "REAL-MPN")).toThrow(
    "Could not find the imported component",
  )
})
