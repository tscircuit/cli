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
}
