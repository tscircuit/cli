import { afterAll } from "bun:test"
import { startServer } from "@tscircuit/fake-snippets/bun-tests/fake-snippets-api/fixtures/start-server"
import { DbClient } from "@tscircuit/fake-snippets/fake-snippets-api/lib/db/db-client"
import ky from "ky"
import { prettyResponseErrorHook } from "lib/registry-api/get-ky"
import { cliConfig } from "lib/cli-config"
import { seed as seedDB } from "@tscircuit/fake-snippets/fake-snippets-api/lib/db/seed"

interface TestFixture {
  url: string
  server: any
  ky: typeof ky
  db: DbClient
}

export const getTestSnippetsServer = async (): Promise<TestFixture> => {
  const port = 3789
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`

  const { server, db } = await startServer({
    port,
    testDbName,
  })

  const url = `http://localhost:${port}/api`
  seedDB(db)
  const kyInstance = ky.create({
    prefixUrl: url,
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
    headers: {
      Authorization: `Bearer ${db.accounts[0].account_id}`,
    },
  })

  cliConfig.set("sessionToken", db.accounts[0].account_id)
  cliConfig.set("registryApiUrl", url)

  afterAll(async () => {
    if (server && typeof server.stop === "function") {
      await server.stop()
    }
  })

  return {
    url,
    server,
    ky: kyInstance,
    db,
  }
}
