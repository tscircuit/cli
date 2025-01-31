import { afterEach } from "bun:test"
import { startServer } from "@tscircuit/fake-snippets/bun-tests/fake-snippets-api/fixtures/start-server"
import { DbClient } from "@tscircuit/fake-snippets/fake-snippets-api/lib/db/db-client"
import ky from "ky"
import { prettyResponseErrorHook } from "lib/registry-api/get-ky"
import { cliConfig } from "lib/cli-config"

interface TestFixture {
  url: string
  server: any
  ky: typeof ky
  db: DbClient
  seed: ReturnType<typeof seedDatabase>
}

export const getTestSnippetsServer = async (): Promise<TestFixture> => {
  const port = 3789
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`

  const { server, db } = await startServer({
    port,
    testDbName,
  })

  const url = `http://127.0.0.1:${port}`
  const seed = seedDatabase(db)
  const kyInstance = ky.create({
    prefixUrl: url,
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
    headers: {
      Authorization: `Bearer ${seed.account.account_id}`,
    },
  })

  cliConfig.set("sessionToken", seed.account.account_id)

  afterEach(async () => {
    if (server && typeof server.stop === "function") {
      await server.stop()
    }
  })

  return {
    url,
    server,
    ky: kyInstance,
    db,
    seed,
  }
}

const seedDatabase = (db: DbClient) => {
  const account = db.addAccount({
    github_username: "testuser",
    shippingInfo: {
      firstName: "Test",
      lastName: "User",
      companyName: "Test Company",
      address: "123 Test St",
      apartment: "Apt 4B",
      city: "Testville",
      state: "NY",
      zipCode: "10001",
      country: "United States of America",
      phone: "555-123-4567",
    },
  })
  const order = db.addOrder({
    account_id: account.account_id,
    is_draft: true,
    is_pending_validation_by_fab: false,
    is_pending_review_by_fab: false,
    is_validated_by_fab: false,
    is_approved_by_fab_review: false,
    is_approved_by_orderer: false,
    is_in_production: false,
    is_shipped: false,
    is_cancelled: false,
    should_be_blank_pcb: false,
    should_include_stencil: false,
    jlcpcb_order_params: {},
    circuit_json: [
      {
        type: "source_component",
        ftype: "simple_resistor",
        source_component_id: "source_component_1",
        name: "R1",
        resistance: "1k",
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { account, order }
}
