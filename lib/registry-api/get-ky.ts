import { getRegistryApiUrl } from "lib/cli-config"
import ky, { type AfterResponseHook } from "ky"
import type { TypedKyInstance } from "typed-ky"
import type { EndpointTypes } from "./endpoint-types"

const prettyResponseErrorHook: AfterResponseHook = async (
  _request,
  _options,
  response,
) => {
  if (!response.ok) {
    try {
      const errorData = await response.json()
      throw new Error(
        `FAIL [${response.status}]: ${_request.method} ${
          new URL(_request.url).pathname
        } \n\n ${JSON.stringify(errorData, null, 2)}`,
      )
    } catch (e) {
      //ignore, allow the error to be thrown
    }
  }
}

export const getKy = (): RegistryKy => {
  return ky.create({
    prefixUrl: getRegistryApiUrl(),
    hooks: {
      afterResponse: [prettyResponseErrorHook],
    },
  }) as any as RegistryKy
}

export type SnippetType = "board" | "package" | "model" | "footprint"

export type Snippet = {
  snippet_id: string
  unscoped_name: string
  name: string
  owner_name: string
  code: string
  created_at: string
  updated_at: string
  snippet_type: SnippetType
  description?: string
  dts?: string
  compiled_js?: string
  manual_edits_json_content?: string
  star_count: number
  circuit_json?: any[] | null
}

export type LiteSnippet = Omit<
  Snippet,
  "code" | "dts" | "compiled_js" | "circuit_json"
>

export interface RegistryApi {
  "sessions/login_page/create": {
    POST: EndpointTypes["sessions/login_page/create"]
  }
  "sessions/login_page/get": {
    POST: EndpointTypes["sessions/login_page/get"]
  }
  "sessions/login_page/exchange_for_cli_session": {
    POST: EndpointTypes["sessions/login_page/exchange_for_cli_session"]
  }
  "snippets/create": {
    POST: {
      requestJson: {
        unscoped_name?: string
        code?: string
        snippet_type: SnippetType
        description?: string
        dts?: string
        compiled_js?: string
        circuit_json?: any
      }
      responseJson: {
        ok: boolean
        snippet: {
          snippet_id: string
          unscoped_name: string
          name: string
          owner_name: string
          code: string
          created_at: string
          updated_at: string
          snippet_type: SnippetType
          description?: string
          dts?: string
          compiled_js?: string
          manual_edits_json_content?: string
          star_count: number
          circuit_json?: any[] | null
        }
      }
    }
  }
  "snippets/get": {
    GET: {
      searchParams: {
        snippet_id?: string
        name?: string
        owner_name?: string
        unscoped_name?: string
      }
      responseJson: {
        ok: boolean
        snippet: Snippet
      }
    }
  }
  "snippets/update": {
    POST: {
      requestJson: {
        snippet_id: string
        code?: string
        description?: string
        unscoped_name?: string
        dts?: string
        compiled_js?: string
        circuit_json?: any
        manual_edits_json_content?: string | null
      }
      responseJson: {
        ok: boolean
        snippet: Snippet
      }
    }
  }
  "snippets/delete": {
    POST: {
      requestJson: {
        snippet_id: string
      }
      responseJson: {
        ok: boolean
      }
    }
  }
  "snippets/list": {
    GET: {
      searchParams: {
        owner_name?: string
        unscoped_name?: string
      }
      responseJson: {
        ok: boolean
        snippets: Array<{
          snippet_id: string
          unscoped_name: string
          name: string
          owner_name: string
          created_at: string
          updated_at: string
          snippet_type: SnippetType
          description?: string
          manual_edits_json_content?: string
          star_count: number
        }>
      }
    }
  }
  "snippets/list_newest": {
    GET: {
      searchParams: {
        limit?: number
      }
      responseJson: {
        snippets: LiteSnippet[]
        lite_snippets: LiteSnippet[]
      }
    }
  }
  "snippets/list_trending": {
    GET: {
      responseJson: {
        snippets: Snippet[]
      }
    }
  }
  "snippets/search": {
    GET: {
      searchParams: {
        q: string
      }
      responseJson: {
        snippets: Snippet[]
      }
    }
  }
  "snippets/add_star": {
    POST: {
      requestJson: {
        snippet_id: string
      }
      responseJson: {
        ok: boolean
      }
    }
  }
  "snippets/remove_star": {
    POST: {
      requestJson: {
        snippet_id: string
      }
      responseJson: {
        ok: boolean
      }
    }
  }

  "package_files/create": {
    POST: {
      requestJson: {
        file_path: string
        is_release_tarball?: boolean
        content_mimetype?: string
        content_text?: string
        content_base64?: string
        package_release_id?: string
        package_name_with_version?: string
        npm_pack_output?: any
      }
      responseJson: {
        ok: boolean
        package_file: {
          package_file_id: string
          package_release_id: string
          file_path: string
          content_text?: string | null
          created_at: string
        }
      }
    }
  }

  "package_files/get": {
    POST: {
      requestJson: {
        package_file_id?: string
        package_release_id?: string
        file_path?: string
        package_id?: string
        version?: string
        package_name?: string
        package_name_with_version?: string
      }
      responseJson:
        | {
            ok: boolean
            package_file?: {
              package_file_id: string
              package_release_id: string
              file_path: string
              content_text?: string | null
              created_at: string
            }
          }
        | {
            error: {
              error_code: string
              message: string
              [key: string]: any
            }
          }
    }
  }

  "package_files/download": {
    GET: {
      searchParams: {
        package_file_id?: string
        package_name_with_version?: string
        file_path?: string
      }
      responseJson: string
    }
    POST: {
      searchParams: {
        package_file_id?: string
        package_name_with_version?: string
        file_path?: string
      }
      responseJson: string
    }
  }

  "package_files/list": {
    POST: {
      requestJson: {
        package_release_id?: string
        package_name?: string
        use_latest_version?: boolean
        package_name_with_version?: string
      }
      responseJson: {
        ok: boolean
        package_files: Array<{
          package_file_id: string
          package_release_id: string
          file_path: string
          content_text?: string | null
          created_at: string
        }>
      }
    }
  }
}

export type RegistryKy = TypedKyInstance<keyof RegistryApi, RegistryApi>
