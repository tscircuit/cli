export type Element = any
export type ElementType = any
export interface JSX {
  Element: Element
}
export const Fragment: unique symbol
export function jsx(type: any, props: any, key?: any): any
export function jsxs(type: any, props: any, key?: any): any
export function jsxDEV(
  type: any,
  props: any,
  key?: any,
  isStaticChildren?: boolean,
  source?: any,
  self?: any,
): any
