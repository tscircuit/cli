export interface EndpointResponse {
  "sessions/login_page/create": {
    login_page: {
      login_page_id: string
      login_page_auth_token: string
      url: string
    }
  }
  "sessions/login_page/get": {
    login_page: {
      was_login_successful: boolean
      is_expired: boolean
    }
  }
  "sessions/login_page/exchange_for_cli_session": {
    session: {
      token: string
    }
  }
  "accounts/get": {
    account: {
      account_id: string
      github_username: string | null
      tscircuit_handle: string
      personal_org_id: string
      created_at: string
      email: string
    }
  }
  "orgs/get": {
    org: {
      org_id: string
      name: string
      user_permissions?: {
        can_manage_org?: boolean
      }
    }
  }
}
