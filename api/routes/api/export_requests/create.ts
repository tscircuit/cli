import { withWinterSpec } from "api/lib/with-winter-spec"
import { z } from "zod"
import { export_parameters } from "api/lib/zod/export_parameters"
import { ExportRequestSchema } from "api/db/schema"

export default withWinterSpec({
  methods: ["POST"],
  jsonBody: z.object({
    example_file_path: z.string(),
    export_name: z.string().nullable().optional(),
    export_parameters: export_parameters,
  }),
  jsonResponse: z.object({
    export_request: ExportRequestSchema,
  }),
  auth: "none",
})(async (req, ctx) => {
  const export_request = await ctx.db.put("export_request", {
    example_file_path: req.jsonBody.example_file_path,
    export_parameters: req.jsonBody.export_parameters,
    export_name: req.jsonBody.export_name ?? "default",
    is_complete: false,
    has_error: false,
    created_at: new Date().toISOString(),
  })

  return ctx.json({
    export_request,
  })
})
