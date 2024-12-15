# File Server API Usage

The file server is a simple API that allows you to upload files and get their contents.

It emits events whenever a file is updated.

The browser preview will typically poll for event
changes.

```
POST /files/upsert
REQUEST: { file_id?, text_content, file_path }
RESPONSE: { file: { file_id, file_path, text_content } }

GET /files/get?file_id?&file_path?
RESPONSE: { file: { file_id, file_path, text_content } }

GET /files/list
RESPONSE { file_list: Array<{ file_id, file_path } }

GET /events/list?since=<iso timestamp>
RESPONSE { event_list: Array<{ event_id, created_at, event_type, ... }> }

POST /events/create
REQUEST { event_type: "..." }
RESPONSE { event: { event_id, ... } }
```

## Starting the File Server

Here's an example of how to start the file server from a vite plugin that starts the file server:

```tsx
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import winterspecBundle from "@tscircuit/file-server/dist/bundle"
import { getNodeHandler } from "winterspec/adapters/node"

const fakeHandler = getNodeHandler(winterspecBundle as any, {})

function apiServerPlugin(): Plugin {
  return {
    name: "api-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          req.url = req.url.replace("/api/", "/")
          fakeHandler(req, res)
        } else {
          next()
        }
      })
    },
  }
}
```
