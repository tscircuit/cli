import { createTiPlatformConfig } from "@tscircuit/ti-parts-engine"

export default {
  platformConfig: createTiPlatformConfig({
    // local CLI/dev usage only
    partnerToken: process.env.PARTNER_TOKEN!,
  }),
}
