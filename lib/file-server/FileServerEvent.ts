export interface FileUpdatedEvent {
  event_id: string
  event_type: "FILE_UPDATED"
  file_path: string
  initiator?: "filesystem_change" | "browser_edit"
  created_at: string
}

export interface AutorunModeEvent {
  event_id: string
  event_type: "AUTORUN_MODE_ENABLED" | "TRIGGER_AUTORUN"
  file_path?: string
  message?: string
  created_at: string
}

export interface FileUploadEvent {
  event_id: string
  event_type: "FILE_UPLOAD_DELAYED" | "FILE_UPLOAD_COMPLETED" | "INITIAL_FILE_UPLOAD_DELAYED" | "INITIAL_FILE_UPLOAD_COMPLETED"
  file_path: string
  message?: string
  created_at: string
}

export type FileServerEvent = FileUpdatedEvent | AutorunModeEvent | FileUploadEvent
