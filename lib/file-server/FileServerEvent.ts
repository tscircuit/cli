export interface FileUpdatedEvent {
  event_id: string
  event_type: "FILE_UPDATED"
  file_path: string
  initiator?: "filesystem_change" | "browser_edit"
  created_at: string
}

export interface InitialFilesUploadedEvent {
  event_id: string
  event_type: "INITIAL_FILES_UPLOADED"
  file_count: number
  created_at: string
}
