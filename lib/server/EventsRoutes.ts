export interface EventsRoutes {
  "api/events/create": {
    POST: {
      requestJson: {
        event_type: string
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
          file_path: string
          created_at: string
          initiator?: string
        }>
      }
    }
  }
}
