"""Integrate a specified copper cross-section from completed Palace fields."""

import argparse
import json
import math
import tempfile
from pathlib import Path

from sample import sample_case


def check_flux(case, specification):
    # Reuse the audited importer at denser, explicitly specified sampling points.
    # No FEM solve or source renormalization is changed by this quadrature check.
    if (
        not isinstance(specification["rows"], int)
        or specification["rows"] < 1
        or not math.isfinite(specification["expectedRealAmps"])
        or specification["expectedRealAmps"] == 0
    ):
        raise ValueError(
            "Flux check requires positive rows and nonzero finite expected current"
        )
    spacing = (specification["yMax"] - specification["yMin"]) / specification["rows"]
    if spacing <= 0 or not specification["xColumns"]:
        raise ValueError("Flux quadrature requires positive spacing and x columns")
    with tempfile.TemporaryDirectory(prefix="palace-flux-", dir=case) as directory:
        temporary = Path(directory)
        for name in [
            "circuit.json",
            "model.json",
            "palace.json",
            "palace.log",
            "mesh.msh",
            "postpro",
        ]:
            (temporary / name).symlink_to(case / name)
        grid = {
            "columns": len(specification["xColumns"]),
            "rows": specification["rows"],
            "cellWidth": 1,
            "cellHeight": spacing,
            "points": [
                {"x": x, "y": specification["yMin"] + (row + 0.5) * spacing}
                for x in specification["xColumns"]
                for row in range(specification["rows"])
            ],
        }
        (temporary / "sample-grid.json").write_text(json.dumps(grid))
        sample_case(temporary)
        reference = json.loads((temporary / "reference.json").read_text())
    cross_sections = []
    for x in specification["xColumns"]:
        samples = [sample for sample in reference["samples"] if sample["x"] == x]
        cross_sections.append(
            {
                "x": x,
                "real": sum(
                    sample["sheetCurrentXReal"] * spacing for sample in samples
                ),
                "imag": sum(
                    sample["sheetCurrentXImag"] * spacing for sample in samples
                ),
            }
        )
    mean = sum(
        complex(section["real"], section["imag"]) for section in cross_sections
    ) / len(cross_sections)
    expected = specification["expectedRealAmps"]
    report = {
        "method": "midpoint integration in y, 5-point Gauss integration through copper thickness",
        "specification": specification,
        "sampleSpacingMm": spacing,
        "frequencyHz": reference["frequencyHz"],
        "femOrder": reference["femOrder"],
        "provenance": reference["provenance"],
        "crossSections": cross_sections,
        "meanRealAmps": mean.real,
        "meanImagAmps": mean.imag,
        "relativeComplexBalanceError": abs(mean - expected) / abs(expected),
    }
    (case / "flux-check.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n"
    )
    print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("case")
    parser.add_argument("specification")
    args = parser.parse_args()
    check_flux(
        Path(args.case).resolve(), json.loads(Path(args.specification).read_text())
    )


if __name__ == "__main__":
    main()
