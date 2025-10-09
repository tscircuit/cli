# File Server API Usage

The file server is a simple API that allows you to upload files and get their contents.

It emits events whenever a file is updated.

The browser preview will typically poll for event
changes.

```
POST /files/upsert
REQUEST: {
  file_id?,
  file_path,
  text_content?,
  binary_content_b64?
}
RESPONSE: {
  file: {
    file_id,
    file_path,
    text_content?,
    binary_content_b64?
  }
}

GET /files/get?file_id?&file_path?
RESPONSE: {
  file: {
    file_id,
    file_path,
    text_content?,
    binary_content_b64?
  }
}

GET /files/list
RESPONSE { file_list: Array<{ file_id, file_path } }

GET /events/list?since=<iso timestamp>
RESPONSE { event_list: Array<{ event_id, created_at, event_type, ... }> }

POST /events/create
REQUEST { event_type: "..." }
RESPONSE { event: { event_id, ... } }
```

## Events

The file server emits several events that clients (like RunFrame) can listen for:

### INITIAL_FILES_UPLOADED

This event is emitted after all initial files have been uploaded to the file server when the dev server starts. Clients should wait for this event before evaluating circuits in autorun mode to ensure all dependencies are available.

```json
{
  "event_type": "INITIAL_FILES_UPLOADED",
  "file_count": 42,
  "created_at": "2025-10-09T12:00:00.000Z"
}
```

### FILE_UPDATED

Emitted whenever a file is modified or created.

### Other Events

- `REQUEST_TO_SAVE_SNIPPET` - Request from the UI to save the current snippet
- `SNIPPET_SAVED` - Confirmation that a snippet was saved successfully
- `FAILED_TO_SAVE_SNIPPET` - Notification that snippet save failed
- `INSTALL_PACKAGE` - Request to install a package
- `PACKAGE_INSTALLED` - Confirmation that a package was installed
- `PACKAGE_INSTALL_FAILED` - Notification that package installation failed

## Testing File Upload Delays

To test scenarios where file uploads are delayed (e.g., slow network), you can use the `DELAY_FILE_UPLOADS` environment variable:

```bash
DELAY_FILE_UPLOADS=100 tsci dev  # Adds 100ms delay between each file upload
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
