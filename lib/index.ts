export { createHttpServer } from "./server/createHttpServer"
export { getLocalFileDependencies } from "./dependency-analysis/getLocalFileDependencies"

// KiCad library conversion exports
export {
  convertToKicadLibrary,
  type ConvertToKicadLibraryOptions,
  type CircuitJsonToKicadModule,
} from "./shared/convert-to-kicad-library"
export {
  buildKicadPcm,
  type BuildKicadPcmOptions,
} from "../cli/build/build-kicad-pcm"
export {
  generatePcmAssets,
  type GeneratePcmAssetsOptions,
  type GeneratePcmAssetsResult,
} from "./shared/generate-pcm-assets"
