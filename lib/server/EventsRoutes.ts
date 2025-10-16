export interface EventsRoutes {
  "api/events/create": {
    POST: {
      requestJson: {
        event_type: string
        file_count?: number
        message?: string
        full_package_name?: string
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
            | "FILE_DELETED"
            | "INITIAL_FILES_UPLOADED"
            | "FAILED_TO_SAVE_SNIPPET"
            | "SNIPPET_SAVED"
            | "REQUEST_TO_SAVE_SNIPPET"
            | "INSTALL_PACKAGE"
            | "PACKAGE_INSTALLED"
            | "PACKAGE_INSTALL_FAILED"
          file_path?: string
          created_at: string
          initiator?: string
          file_count?: number
          message?: string
          full_package_name?: string
        }>
      }
    }
  }
  "api/events/reset": {
    POST: {
      requestJson: {}
      responseJson: { ok: boolean }
    }
  }
}
