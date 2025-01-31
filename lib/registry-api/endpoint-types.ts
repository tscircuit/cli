export interface EndpointTypes {
  "sessions/login_page/create": {
    requestJson: Record<string, never>
    responseJson: {
      login_page: {
        login_page_id: string
        login_page_auth_token: string
        url: string
      }
    }
  }
  "sessions/login_page/get": {
    requestJson: {
      login_page_id: string
    }
    responseJson: {
      login_page: {
        was_login_successful: boolean
        is_expired: boolean
      }
    }
  }
  "sessions/login_page/exchange_for_cli_session": {
    requestJson: {
      login_page_id: string
    }
    responseJson: {
      session: {
        token: string
      }
    }
  }
}
