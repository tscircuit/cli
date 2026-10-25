import { strict as assert } from "node:assert"
import fs from "node:fs"
const [base, head] = process.argv
  .slice(2)
  .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
assert.equal(base.cases.length, 3)
assert.equal(head.cases.length, 3)
for (const current of head.cases) {
  const previous = base.cases.find((entry: any) => entry.mode === current.mode)
  assert.equal(current.inputFixtureSha256, previous.inputFixtureSha256)
  assert.equal(current.allStageInputsRetained, true)
  assert.equal(current.allStageOutputsRetained, true)
  assert.equal(current.retainedInputs, current.mode === "single" ? 1 : 2)
  assert.equal(current.retainedOutputs, current.mode === "single" ? 1 : 2)
  assert.equal(current.legacySingleStageNames, true)
  assert.equal(current.finalImageSha256, previous.finalImageSha256)
  if (current.mode === "single") {
    assert.deepEqual(current.files, previous.files)
    assert.deepEqual(current.outputHashes, previous.outputHashes)
  }
  if (current.mode === "two_images") assert.equal(current.retainedImages, 2)
  console.log(
    `${current.mode}: inputs ${previous.retainedInputs}->${current.retainedInputs}, outputs ${previous.retainedOutputs}->${current.retainedOutputs}, images ${previous.retainedImages}->${current.retainedImages}; median ${previous.medianMs.toFixed(3)}->${current.medianMs.toFixed(3)} ms`,
  )
}
