export interface EventsRoutes {
  "api/events/create": {
    POST: {
      requestJson: {
        event_type: string
        message?: string
      }
      responseJson: {
        event: {
          event_id: string
          event_type: string
        }
      }
    }
  }
  "api/events/list": {
    GET: {
      responseJson: {
        event_list: Array<{
          event_id: string
          event_type:
            | "FILE_UPDATED"
            | "FAILED_TO_SAVE_SNIPPET"
            | "SNIPPET_SAVED"
            | "REQUEST_TO_SAVE_SNIPPET"
            | "INITIAL_FILES_UPLOADED"
          file_path?: string
          file_count?: number
          created_at: string
          initiator?: string
        }>
      }
    }
  }
}
