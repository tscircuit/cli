declare module "@tsci/seveibar.PICO_W" {
  export function usePICO_W(name: string): any
}

declare module "@tsci/seveibar.HS91L02W2C01" {
  export function useHS91L02W2C01(name: string): any
}

declare module "@tsci/seveibar.WS2812B_2020" {
  interface WS2812B_2020Props {
    schX: number
    schY: number
    name: string
    pcbX: number
    pcbY: number
  }

  export const WS2812B_2020: React.FC<WS2812B_2020Props>
}
