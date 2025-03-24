export interface JLCComponent {
  id: string
  name: string
  description: string
  source: "jlcpcb"
  partNumber: string
  package: string
  price: number
}

export interface TscircuitComponent {
  id: string
  name: string
  description?: string
  source: "tscircuit"
  partNumber: string
  code: string
  owner: string
}

export interface ImportComponentEvent {
  event_id: string
  event_type: "IMPORT_COMPONENT"
  created_at: string
  component: JLCComponent | TscircuitComponent
}
