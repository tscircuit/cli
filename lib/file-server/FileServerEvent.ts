export interface FileUpdatedEvent {
  event_id: string
  event_type: "FILE_UPDATED"
  file_path: string
  initiator?: "filesystem_change" | "browser_edit"
  created_at: string
}

export interface FileDeletedEvent {
  event_id: string
  event_type: "FILE_DELETED"
  file_path: string
  created_at: string
}
