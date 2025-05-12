import type { EventsRoutes } from "lib/server/EventsRoutes"

export interface FileServerRoutes extends EventsRoutes {
  "api/files/get": {
    GET: {
      searchParams: {
        file_path: string
      }
      responseJson: {
        file: {
          file_id: string
          file_path: string
          text_content: string
        }
      }
    }
  }
  "api/files/upsert": {
    POST: {
      requestJson: {
        file_path: string
        text_content: string
        initiator?: "filesystem_change"
      }
      responseJson: {
        file: {
          file_id: string
          file_path: string
        }
      }
    }
  }
  "api/files/list": {
    GET: {
      responseJson: {
        file_list: { file_id: string; file_path: string }[]
      }
    }
  }
  "api/files/delete": {
    POST: {
      requestJson: {
        file_path: string
        initiator?: string
      }
      responseJson: null | { error: string }
    }
  }
  "api/files/rename": {
    POST: {
      requestJson: {
        old_file_path: string
        new_file_path: string
        initiator?: string
      }
      responseJson: {
        file: {
          file_id: string
          file_path: string
          text_content: string
          created_at: string
        } | null
      }
    }
  }
}
