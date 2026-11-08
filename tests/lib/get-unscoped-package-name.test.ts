import { expect, test } from "bun:test"
import { getUnscopedPackageName } from "lib/utils/get-unscoped-package-name"

for (const [packageName, expected] of [
  ["usb.connector", "usb.connector"],
  ["alice/usb.connector", "usb.connector"],
  ["@acme/usb.connector", "usb.connector"],
  ["@acme/power.connector", "power.connector"],
  ["@acme/usb.connector.v2", "usb.connector.v2"],
  ["@acme.tools/usb.connector", "usb.connector"],
  ["@tsci/alice.usb.connector", "usb.connector"],
  ["@tsci/alice.usb.connector.v2", "usb.connector.v2"],
  ["usb-connector", "usb-connector"],
  ["alice/usb-connector", "usb-connector"],
  ["@acme/usb-connector", "usb-connector"],
  ["@tsci/alice.usb-connector", "usb-connector"],
  ["@tsci/usb-connector", "usb-connector"],
  ["", ""],
] as const) {
  test(`gets the unscoped name from ${JSON.stringify(packageName)}`, () => {
    expect(getUnscopedPackageName(packageName)).toBe(expected)
  })
}
