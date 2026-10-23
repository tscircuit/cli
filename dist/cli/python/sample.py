"""Read Palace phasors, normalize port basis excitations, and sample ground only."""

import argparse
import csv
import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy
from surface_sample import sample_surface

# Keep VTK sampling deterministic and avoid oversubscribing FEM jobs.
vtk.vtkSMPTools.Initialize(1)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_ports(path):
    with path.open() as stream:
        rows = list(csv.DictReader(stream, skipinitialspace=True))
    return [
        {
            key.strip(): (float(number) if number.strip() != "NULL" else None)
            for key, number in row.items()
        }
        for row in rows
    ]


def read_ground(path):
    # Read piece files directly. vtkXMLPUnstructuredGridReader in VTK 9.3 can
    # expose invalid shared arrays to extract filters for Palace's output.
    pieces = [
        path.parent / piece.attrib["Source"] for piece in ET.parse(path).iter("Piece")
    ]
    readers = []
    append = vtk.vtkAppendFilter()
    for piece in pieces:
        reader = vtk.vtkXMLUnstructuredGridReader()
        reader.SetFileName(str(piece))
        reader.Update()
        if reader.GetOutput().GetNumberOfCells() == 0:
            raise ValueError(f"Empty Palace volume piece: {piece}")
        readers.append(reader)
        append.AddInputData(reader.GetOutput())
    if not readers:
        raise ValueError("Palace data.pvtu contains no piece files")
    if len(readers) == 1:
        mesh = readers[0].GetOutput()
    else:
        append.Update()
        mesh = append.GetOutput()
    attributes = vtk_to_numpy(mesh.GetCellData().GetArray("attribute"))
    copper_cells = np.flatnonzero(attributes == 3)
    ground_cells = vtk.vtkIdList()
    for index in copper_cells:
        # Probe coordinates, not vertex heights, select bottom foil. A plated
        # barrel can share valid copper tetrahedra across z=0; excluding those
        # loses real bottom-plane samples around a ground via.
        ground_cells.InsertNextId(int(index))
    if ground_cells.GetNumberOfIds() == 0:
        raise ValueError("Palace output has no bottom copper volume cells")
    extract = vtk.vtkExtractCells()
    extract.SetInputData(mesh)
    extract.SetCellList(ground_cells)
    extract.Update()
    return extract.GetOutput()


def probe_ground(ground, options):
    coordinates = options["coordinates"]
    model = options["model"]
    electric_field_scale = options["electricFieldScale"]
    locations = vtk.vtkPoints()
    locations.SetData(numpy_to_vtk(coordinates, deep=True))
    mesh = vtk.vtkPolyData()
    mesh.SetPoints(locations)
    probe = vtk.vtkProbeFilter()
    probe.SetInputData(mesh)
    probe.SetSourceData(ground)
    probe.SetCellLocatorPrototype(vtk.vtkStaticCellLocator())
    probe.SetComputeTolerance(False)
    probe.SetTolerance(1e-5)
    probe.Update()
    sampled = probe.GetOutput().GetPointData()
    valid = vtk_to_numpy(sampled.GetArray("vtkValidPointMask")).astype(bool)
    if not valid.all():
        raise ValueError(
            f"{np.count_nonzero(~valid)} sample locations do not lie on Palace ground triangles"
        )
    real = vtk_to_numpy(sampled.GetArray("E_real"))
    imag = vtk_to_numpy(sampled.GetArray("E_imag"))
    if not np.isfinite(real).all() or not np.isfinite(imag).all():
        raise ValueError("Non-finite Palace copper electric field")
    # Ohmic J = sigma E, A/m² → A/mm². Integrate copper depth for K.
    current = (
        (real[:, :2] + 1j * imag[:, :2])
        * electric_field_scale
        * model["copperConductivity"]
        / 1e6
    )
    current = current.reshape(5, -1, 2)
    _, weights = np.polynomial.legendre.leggauss(5)
    return np.einsum("d,dnc->nc", weights / 2, current) * model["copperThickness"]


def coordinate(number):
    return f"{0 if number == 0 else number:.9f}"


def point(position):
    return [coordinate(position["x"]), coordinate(position["y"])]


def geometry_signature(geometry):
    signature = [
        [point(position) for position in geometry["boardOutline"]],
        [
            [
                [point(position) for position in region["outer"]],
                [[point(position) for position in hole] for hole in [*region["holes"], *region.get("maskCutouts", [])]],
            ]
            for region in geometry["groundRegions"]
        ],
        [[point(position) for position in outline] for outline in geometry["cutouts"]],
        [
            [
                [*point(route), coordinate(route["width"]), route["layer"]]
                for route in signal["route"]
                if route["route_type"] == "wire"
            ]
            for signal in geometry["signals"]
        ],
        *([geometry["physicalModelSignature"]] if geometry.get("physicalModelSignature") else []),
        [
            [
                coordinate(excitation["current"]),
                point(excitation["return_source"]),
                point(excitation["return_sink"]),
                *([[excitation.get("source_port", {}).get("reference_layer", "bottom"), coordinate(excitation.get("source_port", {}).get("resistance", 50)), excitation.get("load_port", {}).get("reference_layer", "bottom"), coordinate(excitation.get("load_port", {}).get("resistance", 50))]] if excitation.get("source_port") or excitation.get("load_port") else []),
            ]
            for excitation in geometry["excitations"]
        ],
    ]
    return json.dumps(signature, separators=(",", ":"))


def serialize_currents(currents):
    return [
        {"real": float(current.real), "imag": float(current.imag)}
        for current in currents
    ]


def sample_case(case):
    model = json.loads((case / "model.json").read_text())
    grid = json.loads((case / "sample-grid.json").read_text())
    config = json.loads((case / "palace.json").read_text())
    log = (case / "palace.log").read_text()
    version = re.search(r"Git changeset ID:\s*(\S+)", log)
    if not version or version[1] != "v0.14.0":
        raise ValueError(
            "This importer requires Palace v0.14.0, whose ParaView fields are nondimensional; other versions require an audited units adapter"
        )
    if not re.search(r"^Total\s+[0-9.]+\s+[0-9.]+\s+[0-9.]+", log, re.MULTILINE):
        raise ValueError("Only completed Palace runs can be imported")
    if re.search(r"solver.*(?:did not|failed to).*converge", log, re.IGNORECASE):
        raise ValueError("Palace linear solver failed to converge")
    postpro = case / config["Problem"]["Output"]
    rows = read_ports(postpro / "port-I.csv")
    excitations = model["geometry"]["excitations"]
    count = len(excitations)
    if len(rows) != 1:
        raise ValueError(
            "Expected exactly one frequency row containing all port basis solutions"
        )
    # Palace reports V/R, the current in each port's termination, not the net
    # current injected into the PCB. A driven port also has a Norton source
    # of 2*I_inc. Thus I_into_PCB = 2*I_inc - I_termination at active ports.
    source_matrix = np.zeros((count, count), dtype=complex)
    load_matrix = np.zeros_like(source_matrix)
    fields = []
    surface_receipts = []
    outline = model["geometry"]["boardOutline"]
    width = (
        max(p["x"] for p in outline)
        - min(p["x"] for p in outline)
        + 2 * model["airPadding"]
    )
    height = (
        max(p["y"] for p in outline)
        - min(p["y"] for p in outline)
        + 2 * model["airPadding"]
    )
    depth = model["layerSeparation"] + 2 * model["airPadding"]
    characteristic_length_m = (
        config["Model"].get("Lc", max(width, height, depth)) * config["Model"]["L0"]
    )
    impedance_free_space = math.sqrt((4e-7 * math.pi) / 8.8541878176e-12)
    electric_field_scale = impedance_free_space**0.5 / characteristic_length_m
    surface_impedance = model["copperModel"] == "surface_impedance_copper"
    surface_current_scale = 1 / (impedance_free_space**0.5 * characteristic_length_m * 1000)
    coordinates = np.array([[point["x"], point["y"]] for point in grid["points"]])
    depth_nodes, _ = np.polynomial.legendre.leggauss(5)
    depths = (depth_nodes - 1) / 2 * model["copperThickness"]
    if model.get("multilayer"):
        foil = next(layer for layer in model["multilayer"]["stackup"]["copperLayers"]
                    if layer["name"] == model["multilayer"]["sampleLayer"])
        depths = foil["zMin"] + (depth_nodes + 1) / 2 * (foil["zMax"] - foil["zMin"])
    volume_coordinates = np.concatenate(
        [
            np.column_stack([coordinates, np.full(len(coordinates), depth)])
            for depth in depths
        ]
    )
    for basis in range(count):
        row = rows[0]
        excitation_index = 2 * basis + 1
        if (
            abs(row["f (GHz)"] * 1e9 - model["frequencyHz"])
            > model["frequencyHz"] * 1e-8
        ):
            raise ValueError("Palace output frequency does not match the model")
        for index in range(count):
            source_index, load_index = 2 * index + 1, 2 * index + 2
            source_label = (
                f"[{source_index}][{excitation_index}]"
                if count > 1
                else f"[{source_index}]"
            )
            load_label = (
                f"[{load_index}][{excitation_index}]"
                if count > 1
                else f"[{load_index}]"
            )
            incident_label = (
                f"[{source_index}][{excitation_index}]"
                if count > 1
                else f"[{source_index}]"
            )
            termination = complex(
                row[f"Re{{I{source_label}}} (A)"], row[f"Im{{I{source_label}}} (A)"]
            )
            incident = (
                row.get(f"I_inc{incident_label} (A)", 0.0) if index == basis else 0.0
            )
            source_matrix[index, basis] = 2 * incident - termination
            load_matrix[index, basis] = complex(
                row[f"Re{{I{load_label}}} (A)"], row[f"Im{{I{load_label}}} (A)"]
            )
        boundary = postpro / "paraview" / ("driven_boundary" if surface_impedance else "driven")
        if count > 1:
            boundary = boundary / f"excitation_{excitation_index}"
        path = boundary / "Cycle000001" / "data.pvtu"
        fields.append(sample_surface(path, coordinates, model, surface_current_scale, surface_receipts) if surface_impedance else
            probe_ground(
                read_ground(path),
                {
                    "coordinates": volume_coordinates,
                    "model": model,
                    "electricFieldScale": electric_field_scale,
                },
            )
        )
    condition = float(np.linalg.cond(source_matrix))
    if not np.isfinite(condition) or condition > 1e8:
        raise ValueError("Source-current normalization is singular or ill-conditioned")
    desired = np.array(
        [excitation["current"] for excitation in excitations], dtype=complex
    )
    coefficients = np.linalg.solve(source_matrix, desired)
    combined = np.einsum("b,bnc->nc", coefficients, np.stack(fields))
    normalized_sources = source_matrix @ coefficients
    normalized_loads = load_matrix @ coefficients
    if not np.allclose(normalized_sources, desired, atol=1e-10, rtol=1e-10):
        raise ValueError("Source-current normalization failed")
    samples = [
        {
            "x": float(x),
            "y": float(y),
            "sheetCurrentXReal": float(current[0].real),
            "sheetCurrentYReal": float(current[1].real),
            "sheetCurrentXImag": float(current[0].imag),
            "sheetCurrentYImag": float(current[1].imag),
        }
        for (x, y), current in zip(coordinates, combined)
    ]
    reference = {
        "schemaVersion": 1,
        **({"sampleLayer": model["multilayer"]["sampleLayer"]} if model.get("multilayer") else {}),
        "solver": "palace",
        "solverVersion": version[1],
        "femOrder": model["order"],
        "frequencyHz": model["frequencyHz"],
        "copperModel": model["copperModel"],
        **({"samplingMethod": "sum_foil_face_surface_currents", "surfaceCurrentScaleAmpsPerMm": surface_current_scale} if surface_impedance else {}),
        "copperThickness": model["copperThickness"],
        "layerSeparation": model["layerSeparation"],
        **{key: grid[key] for key in ["cellWidth", "cellHeight", "columns", "rows"]},
        "samples": samples,
        "sourceCurrents": serialize_currents(normalized_sources),
        "loadCurrents": serialize_currents(normalized_loads),
        "normalizationConditionNumber": condition,
        "electricFieldScaleVoltsPerMeter": electric_field_scale,
        "provenance": {
            "circuitSha256": digest(case / "circuit.json"),
            "geometrySignature": geometry_signature(model["geometry"]),
            "modelSha256": digest(case / "model.json"),
            "meshSha256": digest(case / "mesh.msh"),
        },
    }
    (case / "reference.json").write_text(
        json.dumps(reference, separators=(",", ":"), allow_nan=False) + "\n"
    )
    (case / "normalization.json").write_text(
        json.dumps(
            {
                "basisCoefficients": serialize_currents(coefficients),
                "sourceCurrents": reference["sourceCurrents"],
                "loadCurrents": reference["loadCurrents"],
                "conditionNumber": condition,
            },
            indent=2,
        )
        + "\n"
    )
    if surface_impedance:
        (case / "surface-sampling.json").write_text(json.dumps({
            "copperModel": model["copperModel"],
            "method": "sum_foil_face_surface_currents",
            "normalConvention": "metal-outward normal crossed with H; no additional face sign flip",
            "units": "A/mm, complex peak phasors after source-current basis normalization",
            "bases": surface_receipts,
        }, indent=2, allow_nan=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("case")
    args = parser.parse_args()
    sample_case(Path(args.case).resolve())


if __name__ == "__main__":
    main()
