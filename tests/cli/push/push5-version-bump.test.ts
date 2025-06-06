import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should bump version if release already exists", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const packageJsonPath = path.resolve(tmpDir, "package.json")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout: stdout1, stderr: stderr1 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout1, stderr: stderr1 }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "LocalStorage is not available. LocalStorageCache will not function.
    Package author does not match the logged in GitHub username
     5 |     constructor(response, request, options) {
     6 |         const code = (response.status || response.status === 0) ? response.status : '';
     7 |         const title = response.statusText || '';
     8 |         const status = \`\${code} \${title}\`.trim();
     9 |         const reason = status ? \`status code \${status}\` : 'an unknown error';
    10 |         super(\`Request failed with \${reason}: \${request.method} \${request.url}\`);
                 ^
    HTTPError: Request failed with status code 400 Bad Request: POST http://localhost:54632/api/package_releases/update
     response: Response (86 bytes) {
      ok: false,
      url: "http://localhost:54632/api/package_releases/update",
      status: 400,
      statusText: "Bad Request",
      headers: Headers {
        "content-type": "application/json",
        "date": "Fri, 06 Jun 2025 04:34:31 GMT",
        "content-length": "86",
      },
      redirected: false,
      bodyUsed: false,
      Blob (86 bytes)
    },
      request: Request (82 bytes) {
      method: "POST",
      url: "http://localhost:54632/api/package_releases/update",
      headers: Headers {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiYWNjb3VudC0xMjM0IiwiZ2l0aHViX3VzZXJuYW1lIjoidGVzdC11c2VyIiwic2Vzc2lvbl9pZCI6InNlc3Npb24tMTIzIiwiaWF0IjoxNzQ5MTg0NDcxfQ.KkucAFVyvGHsrR8o9rQxVDtgiJdtNa5wDSwp0oCa88A",
        "content-type": "application/json",
      }
      Blob (82 bytes)
    },
      options: {
      prefixUrl: "http://localhost:54632/api/",
      headers: Headers [Object ...],
      hooks: [Object ...],
      json: [Object ...],
      method: "POST",
      retry: [Object ...],
      throwHttpErrors: true,
      timeout: 10000,
      fetch: [Function: fetch],
      signal: [AbortSignal ...],
      body: "{\\"package_name_with_version\\":\\"test-user/test-package@1.0.0\\",\\"ready_to_build\\":true}",
    },

          at new HTTPError (/Users/seve/w/tsc/cli/node_modules/ky/distribution/errors/HTTPError.js:10:9)
          at <anonymous> (/Users/seve/w/tsc/cli/node_modules/ky/distribution/core/Ky.js:28:29)

    Bun v1.2.15 (macOS arm64)
    "
    ,
      "stdout": 
    "{
      currentUsername: "test-user",
    }
    Package created


    ⬆︎ package.json
    ⬆︎ snippet.tsx
    "
    ,
    }
  `)

  const { stdout: stdout2, stderr: stderr2 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout2, stderr: stderr2 }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "LocalStorage is not available. LocalStorageCache will not function.
    Package author does not match the logged in GitHub username
     5 |     constructor(response, request, options) {
     6 |         const code = (response.status || response.status === 0) ? response.status : '';
     7 |         const title = response.statusText || '';
     8 |         const status = \`\${code} \${title}\`.trim();
     9 |         const reason = status ? \`status code \${status}\` : 'an unknown error';
    10 |         super(\`Request failed with \${reason}: \${request.method} \${request.url}\`);
                 ^
    HTTPError: Request failed with status code 400 Bad Request: POST http://localhost:54632/api/package_releases/update
     response: Response (86 bytes) {
      ok: false,
      url: "http://localhost:54632/api/package_releases/update",
      status: 400,
      statusText: "Bad Request",
      headers: Headers {
        "content-type": "application/json",
        "date": "Fri, 06 Jun 2025 04:34:31 GMT",
        "content-length": "86",
      },
      redirected: false,
      bodyUsed: false,
      Blob (86 bytes)
    },
      request: Request (82 bytes) {
      method: "POST",
      url: "http://localhost:54632/api/package_releases/update",
      headers: Headers {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiYWNjb3VudC0xMjM0IiwiZ2l0aHViX3VzZXJuYW1lIjoidGVzdC11c2VyIiwic2Vzc2lvbl9pZCI6InNlc3Npb24tMTIzIiwiaWF0IjoxNzQ5MTg0NDcxfQ.KkucAFVyvGHsrR8o9rQxVDtgiJdtNa5wDSwp0oCa88A",
        "content-type": "application/json",
      }
      Blob (82 bytes)
    },
      options: {
      prefixUrl: "http://localhost:54632/api/",
      headers: Headers [Object ...],
      hooks: [Object ...],
      json: [Object ...],
      method: "POST",
      retry: [Object ...],
      throwHttpErrors: true,
      timeout: 10000,
      fetch: [Function: fetch],
      signal: [AbortSignal ...],
      body: "{\\"package_name_with_version\\":\\"test-user/test-package@1.0.1\\",\\"ready_to_build\\":true}",
    },

          at new HTTPError (/Users/seve/w/tsc/cli/node_modules/ky/distribution/errors/HTTPError.js:10:9)
          at <anonymous> (/Users/seve/w/tsc/cli/node_modules/ky/distribution/core/Ky.js:28:29)

    Bun v1.2.15 (macOS arm64)
    "
    ,
      "stdout": 
    "{
      currentUsername: "test-user",
    }
    Incrementing Package Version 1.0.0 -> 1.0.1


    ⬆︎ package.json
    ⬆︎ snippet.tsx
    "
    ,
    }
  `)
})
