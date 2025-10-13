export interface FileUpdatedEvent {
  event_id: string
  event_type: "FILE_UPDATED"
  file_path: string
  initiator?: "filesystem_change" | "browser_edit"
  created_at: string
}

export interface AllFilesLoadedEvent {
  event_id: string
  event_type: "ALL_FILES_LOADED"
  created_at: string
}
