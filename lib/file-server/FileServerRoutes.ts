export interface FileServerRoutes {
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
}
