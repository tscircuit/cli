The signal-integrity fixture uses the real TI SN74LVC1G04 DCK 3.3 V models.
The tests copy `TSCI_TEST_IBIS_PATH` when set, otherwise download
https://www.ti.com/lit/zip/scem216c and extract
`SN74LVC1G04_IBIS/sn74lvc1g04.ibs`. The SHA-256 is checked before use.
Vendor IBIS contents are not redistributed in this repository.

Only `runPipeline(circuitJson)` is mocked in the CLI child. Its result records
are synthetic formatting fixtures. Rendering `<signalintegrity>` requires the
props, circuit-json and core sibling PRs for https://github.com/tscircuit/rfc/pull/26.
A real solver run also requires the signal-integrity-pipeline sibling PR.
