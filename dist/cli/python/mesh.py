"""Generate a conforming 3D Gmsh mesh. All dimensions are millimetres.
No field solver is implemented here: Palace solves the driven Maxwell system.
"""

import argparse
import json
from pathlib import Path

import gmsh
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union
from shapely.geometry.polygon import orient


def points(outline):
    return [(p["x"], p["y"]) for p in outline]


def add_ring(coordinates, z):
    vertices = [gmsh.model.occ.addPoint(x, y, z) for x, y in list(coordinates)[:-1]]
    edges = [
        gmsh.model.occ.addLine(vertices[i], vertices[(i + 1) % len(vertices)])
        for i in range(len(vertices))
    ]
    return gmsh.model.occ.addCurveLoop(edges)


def add_polygon(polygon, z):
    # OCC assigns holes by ring order and expects matching wire winding here.
    # Shapely gives interior rings the opposite winding; passing those unchanged
    # adds their area and creates overlapping interfaces in drilled boards.
    polygon = orient(polygon, sign=1)
    rings = [add_ring(polygon.exterior.coords, z)]
    rings.extend(add_ring(list(ring.coords)[::-1], z) for ring in polygon.interiors)
    return (2, gmsh.model.occ.addPlaneSurface(rings))


def polygons(shape):
    if shape.geom_type == "Polygon":
        return [shape]
    if shape.geom_type == "MultiPolygon":
        return list(shape.geoms)
    raise ValueError("Expected nonempty copper polygons")


def via_shapes(model):
    vias = model.get("groundVias", [])
    outlines = model["geometry"]["cutouts"][-len(vias):] if vias else []
    result = []
    for via, outline in zip(vias, outlines):
        hole = Polygon(points(outline))
        ratio = (via["holeDiameter"] / 2 + via["platingThickness"]) / (via["holeDiameter"] / 2)
        outer = Polygon([(via["x"] + (x - via["x"]) * ratio,
                          via["y"] + (y - via["y"]) * ratio)
                         for x, y in hole.exterior.coords])
        result.append((hole, outer))
    return result


def port_definition(model, index, legacy):
    if model.get("ports"):
        return model["ports"][index]
    endpoint, _ = legacy
    return {"signal": endpoint, "reference": endpoint,
            "referenceLayer": "bottom", "resistance": model["portResistance"]}


def port_direction(model, port):
    dx = port["reference"]["x"] - port["signal"]["x"]
    dy = port["reference"]["y"] - port["signal"]["y"]
    dz = port["referenceZ"] - port["signalZ"] if model.get("multilayer") else (-model["layerSeparation"] if port["referenceLayer"] == "bottom" else 0)
    length = (dx * dx + dy * dy + dz * dz) ** 0.5
    if length < 1e-9:
        raise ValueError("Signal and reference terminals coincide")
    return [dx / length, dy / length, dz / length]


def port_corners(model, port, legacy):
    endpoint, neighbor = legacy
    signal, reference = port["signal"], port["reference"]
    dx, dy = reference["x"] - signal["x"], reference["y"] - signal["y"]
    if abs(dx) + abs(dy) < 1e-9:
        dx, dy = neighbor["x"] - endpoint["x"], neighbor["y"] - endpoint["y"]
    length = (dx * dx + dy * dy) ** 0.5
    tx, ty = -dy / length * model["portWidth"] / 2, dx / length * model["portWidth"] / 2
    z = model["layerSeparation"]
    rz = z if port["referenceLayer"] == "top" else 0
    return [(signal["x"] - tx, signal["y"] - ty, z),
            (signal["x"] + tx, signal["y"] + ty, z),
            (reference["x"] + tx, reference["y"] + ty, rz),
            (reference["x"] - tx, reference["y"] - ty, rz)]


def add_port(port, model, legacy, signals, ground, ground_pads, board):
    corners = port_corners(model, port, legacy)
    signal_contact = LineString([corner[:2] for corner in corners[:2]])
    reference_contact = LineString([corner[:2] for corner in corners[2:]])
    if not signals.covers(signal_contact):
        raise ValueError("Port aperture leaves signal copper")
    if port["referenceLayer"] == "top":
        if not ground_pads.covers(reference_contact):
            raise ValueError("Top reference aperture leaves its ground pad")
        patch = Polygon([corner[:2] for corner in corners]).difference(unary_union([signals, ground_pads]))
        if patch.geom_type != "Polygon" or patch.is_empty or len(patch.interiors):
            raise ValueError("Top port needs one clear gap between signal and reference pads")
        if not board.covers(patch):
            raise ValueError("Port crosses a drilled hole, cutout or board edge")
        # Each end of this aperture must touch the intended conductor. A signal
        # crossed along the gap splits it and is rejected above.
        if patch.boundary.intersection(signals.boundary).length < model["portWidth"] * 0.9 or patch.boundary.intersection(ground_pads.boundary).length < model["portWidth"] * 0.9:
            raise ValueError("Port gap does not contact both terminals")
        return add_polygon(patch, model["layerSeparation"])
    if not ground.covers(reference_contact):
        raise ValueError("Port aperture leaves ground copper")
    footprint = Polygon([corner[:2] for corner in corners])
    if footprint.area > 1e-12 and not board.covers(footprint):
        raise ValueError("Port crosses a drilled hole, cutout or board edge")
    vertices = [gmsh.model.occ.addPoint(*corner) for corner in corners]
    edges = [gmsh.model.occ.addLine(vertices[i], vertices[(i + 1) % 4]) for i in range(4)]
    return (2, gmsh.model.occ.addPlaneSurface([gmsh.model.occ.addCurveLoop(edges)]))


def generate_mesh(model, destination):
    if model.get("multilayer"):
        from mesh_multilayer import generate_multilayer_mesh
        return generate_multilayer_mesh(model, destination)
    geometry = model["geometry"]
    surface_impedance = model["copperModel"] == "surface_impedance_copper"
    board = Polygon(points(geometry["boardOutline"]))
    for cutout in geometry["cutouts"]:
        board = board.difference(Polygon(points(cutout)))
    ground = unary_union(
        [
            Polygon(points(region["outer"]), [points(hole) for hole in region["holes"]])
            for region in geometry["groundRegions"]
        ]
    ).intersection(board)
    if not board.is_valid or not ground.is_valid:
        raise ValueError("Invalid PCB/ground polygon")
    pads = [Polygon(points(outline)) for outline in model["topPads"]]
    ground_pad_shapes = [Polygon(points(outline)) for outline in model.get("topGroundPads", [])]
    ground_pads = unary_union(ground_pad_shapes)
    undrilled_board = Polygon(points(geometry["boardOutline"]))
    for pad in ground_pad_shapes:
        if not undrilled_board.covers(pad):
            raise ValueError("Ground pad leaves substrate")
    signals = []
    ports = []
    for signal in geometry["signals"]:
        route = [
            point
            for index, point in enumerate(signal["route"])
            if index == 0
            or (point["x"], point["y"])
            != (signal["route"][index - 1]["x"], signal["route"][index - 1]["y"])
        ]
        strips = [
            LineString([(start["x"], start["y"]), (end["x"], end["y"])]).buffer(
                start["width"] / 2, cap_style="square", join_style="mitre"
            )
            for start, end in zip(route, route[1:])
        ]
        trace = unary_union(strips)
        connected_pads = [pad for pad in pads if pad.intersects(trace)]
        trace = unary_union([trace, *connected_pads])
        if not board.covers(trace):
            raise ValueError("Signal copper leaves the substrate")
        for other in signals:
            if other.intersects(trace):
                raise ValueError("Top signal copper overlaps another signal")
        signals.append(trace)
        ports.extend([(route[0], route[1]), (route[-1], route[-2])])
    if any(not any(pad.intersects(signal) for signal in signals) for pad in pads):
        raise ValueError(
            "Unconnected top SMT pads are not supported by this reference model"
        )
    if not ground_pads.is_empty and unary_union(signals).intersects(ground_pads):
        raise ValueError("Signal and ground pad copper overlap")
    gmsh.initialize()
    try:
        gmsh.model.add("return-current")
        height = model["layerSeparation"]
        substrate_shape = board
        for _, outer in via_shapes(model):
            substrate_shape = substrate_shape.difference(outer)
        substrate_surfaces = [add_polygon(polygon, 0) for polygon in polygons(substrate_shape)]
        substrate = [
            entity
            for surface in substrate_surfaces
            for entity in gmsh.model.occ.extrude([surface], 0, 0, height)
            if entity[0] == 3
        ]
        min_x, min_y, max_x, max_y = board.bounds
        padding = model["airPadding"]
        air = (
            3,
            gmsh.model.occ.addBox(
                min_x - padding,
                min_y - padding,
                -padding,
                max_x - min_x + 2 * padding,
                max_y - min_y + 2 * padding,
                height + 2 * padding,
            ),
        )
        ground_surfaces = [add_polygon(polygon, 0) for polygon in polygons(ground)]
        top_ground_surfaces = [
            add_polygon(polygon, height)
            for pad in ground_pad_shapes
            for polygon in polygons(pad.intersection(board))
        ]
        signal_surfaces = [
            add_polygon(polygon, height)
            for signal in signals
            for polygon in polygons(signal)
        ]
        copper = [
            entity
            for surface in ground_surfaces
            for entity in gmsh.model.occ.extrude(
                [surface], 0, 0, -model["copperThickness"]
            )
            if entity[0] == 3
        ]
        copper += [
            entity
            for surface in [*signal_surfaces, *top_ground_surfaces]
            for entity in gmsh.model.occ.extrude(
                [surface], 0, 0, model["copperThickness"]
            )
            if entity[0] == 3
        ]
        for hole, outer in via_shapes(model):
            annulus = add_polygon(outer.difference(hole), -model["copperThickness"])
            copper.extend(entity for entity in gmsh.model.occ.extrude([annulus], 0, 0,
                          height + 2 * model["copperThickness"]) if entity[0] == 3)
        if model.get("groundVias") or surface_impedance:
            copper, _ = gmsh.model.occ.fuse(copper[:1], copper[1:])
        port_surfaces = [add_port(port_definition(model, index, legacy), model, legacy,
                                 unary_union(signals), ground, ground_pads, board)
                         for index, legacy in enumerate(ports)]
        if model.get("groundVias") or surface_impedance:
            # Volumes already provide these copper interfaces. Coplanar
            # marking sheets with different via-hole rings can duplicate facets.
            ground_surfaces = []
            top_ground_surfaces = []
            signal_surfaces = []
        tools = [
            *substrate,
            *copper,
            *ground_surfaces,
            *top_ground_surfaces,
            *signal_surfaces,
            *port_surfaces,
        ]
        _, mapping = gmsh.model.occ.fragment([air], tools)
        gmsh.model.occ.synchronize()
        substrate_tags = {
            tag
            for descendants in mapping[1 : 1 + len(substrate)]
            for dim, tag in descendants
            if dim == 3
        }
        copper_tags = {
            tag
            for descendants in mapping[
                1 + len(substrate) : 1 + len(substrate) + len(copper)
            ]
            for dim, tag in descendants
            if dim == 3
        }
        substrate_tags -= copper_tags
        air_tags = (
            {tag for dim, tag in mapping[0] if dim == 3} - substrate_tags - copper_tags
        )
        if not surface_impedance:
            gmsh.model.addPhysicalGroup(3, sorted(copper_tags), 3, "copper")
        gmsh.model.addPhysicalGroup(3, sorted(air_tags), 1, "air")
        gmsh.model.addPhysicalGroup(3, sorted(substrate_tags), 2, "substrate")
        offset = 1 + len(substrate) + len(copper)
        ground_tags = sorted(
            {
                tag
                for descendants in mapping[offset : offset + len(ground_surfaces) + len(top_ground_surfaces)]
                for dim, tag in descendants
                if dim == 2
            }
        )
        offset += len(ground_surfaces) + len(top_ground_surfaces)
        signal_tags = sorted(
            {
                tag
                for descendants in mapping[offset : offset + len(signal_surfaces)]
                for dim, tag in descendants
                if dim == 2
            }
        )
        offset += len(signal_surfaces)
        if model.get("groundVias") or surface_impedance:
            copper_boundaries = {tag for dim, tag in gmsh.model.getBoundary([(3, tag) for tag in copper_tags], combined=False, oriented=False) if dim == 2}
            if surface_impedance:
                exterior = {tag for dim, tag in gmsh.model.getBoundary([(3, tag) for tag in copper_tags], combined=True, oriented=False) if dim == 2}
                active = {tag for dim, tag in gmsh.model.getBoundary([(3, tag) for tag in air_tags | substrate_tags], combined=False, oriented=False) if dim == 2}
                copper_boundaries = exterior & active
                if not copper_boundaries:
                    raise ValueError("Surface impedance has no exposed conductor interfaces")
            for tag in sorted(copper_boundaries):
                x, y, z = gmsh.model.occ.getCenterOfMass(2, tag)
                if ((height - 1e-7 <= z <= height + model["copperThickness"] + 1e-7) if surface_impedance else abs(z - height) < 1e-7) and unary_union(signals).covers(Point(x, y)):
                    signal_tags.append(tag)
                else:
                    ground_tags.append(tag)
        gmsh.model.addPhysicalGroup(2, ground_tags, 11, "ground")
        if signal_tags:
            gmsh.model.addPhysicalGroup(2, signal_tags, 12, "signals")
        port_tags = []
        for index, descendants in enumerate(mapping[offset:]):
            tags = [tag for dim, tag in descendants if dim == 2]
            if not tags or set(tags).intersection(port_tags):
                raise ValueError("Lumped port apertures overlap or have no meshed surface")
            gmsh.model.addPhysicalGroup(2, tags, 21 + index, f"port-{index + 1}")
            port_tags.extend(tags)
        if surface_impedance and set(port_tags).intersection(ground_tags + signal_tags):
            raise ValueError("Lumped port aperture overlaps a conductor impedance face")
        outer = [
            tag
            for dim, tag in gmsh.model.getBoundary(
                [(3, tag) for tag in sorted(air_tags | substrate_tags | copper_tags)],
                combined=True,
                oriented=False,
            )
            if dim == 2
        ]
        gmsh.model.addPhysicalGroup(2, outer, 13, "outer-air")
        copper_volume = sum(gmsh.model.occ.getMass(3, tag) for tag in copper_tags)
        if surface_impedance:
            # Preserve all conductor interfaces and their physical attributes;
            # remove only Cu volume entities from the field-solve domain.
            gmsh.model.occ.remove([(3, tag) for tag in copper_tags], recursive=False)
            gmsh.model.occ.synchronize()
        copper_edges = sorted(
            {
                tag
                for dim, tag in gmsh.model.getBoundary(
                    [(2, tag) for tag in [*ground_tags, *signal_tags, *port_tags]],
                    combined=False,
                    oriented=False,
                )
                if dim == 1
            }
        )
        distance = gmsh.model.mesh.field.add("Distance")
        gmsh.model.mesh.field.setNumbers(distance, "CurvesList", copper_edges)
        gmsh.model.mesh.field.setNumber(distance, "Sampling", 100)
        threshold = gmsh.model.mesh.field.add("Threshold")
        gmsh.model.mesh.field.setNumber(threshold, "InField", distance)
        gmsh.model.mesh.field.setNumber(
            threshold, "SizeMin", min(model["meshSize"] / 3, model["portWidth"] / 2)
        )
        gmsh.model.mesh.field.setNumber(threshold, "SizeMax", model["meshSize"])
        gmsh.model.mesh.field.setNumber(threshold, "DistMin", 0.05)
        gmsh.model.mesh.field.setNumber(threshold, "DistMax", 1.5)
        gmsh.model.mesh.field.setAsBackgroundMesh(threshold)
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.Algorithm3D", 1)
        gmsh.option.setNumber("General.NumThreads", 1)
        gmsh.option.setNumber("Mesh.MshFileVersion", 2.2)
        gmsh.model.mesh.generate(3)
        gmsh.write(str(destination / "mesh.msh"))
        summary = {
            "nodes": len(gmsh.model.mesh.getNodes()[0]),
            "tetrahedra": sum(len(tags) for tags in gmsh.model.mesh.getElements(3)[1]),
            "groundAttribute": 11,
            "signalAttribute": 12,
            "portAttributes": list(range(21, 21 + len(ports))),
            "copperSolidVolumeMm3": copper_volume,
        }
        if surface_impedance:
            summary["copperModel"] = model["copperModel"]
            summary["conductivityBoundaryAttributes"] = [11, 12]
            summary["surfaceImpedance"] = model["surfaceImpedance"]
        (destination / "mesh-summary.json").write_text(
            json.dumps(summary, indent=2) + "\n"
        )
    finally:
        gmsh.finalize()
    return len(ports)


def create_configuration(model, port_count):
    ports = [
        {
            "Index": index + 1,
            "Attributes": [21 + index],
            "Direction": port_direction(model, model["ports"][index]) if model.get("ports") else "-Z",
            "R": model["ports"][index]["resistance"] if model.get("ports") else model["portResistance"],
            **({"Excitation": index + 1} if index % 2 == 0 else {}),
        }
        for index in range(port_count)
    ]
    configuration = {
        "Problem": {"Type": "Driven", "Verbose": 2, "Output": "postpro"},
        "Model": {
            "Mesh": "mesh.msh",
            "L0": 1e-3,
            "Lc": 1.0,
            "CrackInternalBoundaryElements": False,
        },
        "Domains": {
            "Materials": [
                {"Attributes": [1], "Permittivity": 1.0, "Permeability": 1.0},
                {
                    "Attributes": [2],
                    "Permittivity": model["substratePermittivity"],
                    "Permeability": 1.0,
                    "LossTan": model["substrateLossTangent"],
                },
                {
                    "Attributes": [3],
                    "Permittivity": 1.0,
                    "Permeability": 1.0,
                    "Conductivity": model["copperConductivity"],
                },
            ]
        },
        "Boundaries": {
            "Absorbing": {"Attributes": [13], "Order": 1},
            "LumpedPort": ports,
        },
        "Solver": {
            "Order": model["order"],
            "Device": "CPU",
            "Driven": {
                "Samples": [
                    {
                        "Type": "Point",
                        "Freq": [model["frequencyHz"] / 1e9],
                        "SaveStep": 1,
                    }
                ]
            },
            "Linear": {
                "Type": "SuperLU",
                "KSPType": "GMRES",
                "Tol": 1e-9,
                "MaxIts": 200,
                "ComplexCoarseSolve": True,
                "PCMatShifted": False,
            },
        },
    }

    if model.get("multilayer"):
        configuration["Domains"]["Materials"] = [
            configuration["Domains"]["Materials"][0],
            configuration["Domains"]["Materials"][-1],
            *[{"Attributes": [layer["attribute"]], "Permittivity": layer["dielectricConstant"],
               "Permeability": 1.0, "LossTan": layer["lossTangent"]}
              for layer in model["multilayer"]["stackup"]["dielectrics"]]
        ]
    if model["copperModel"] == "surface_impedance_copper":
        configuration["Domains"]["Materials"] = configuration["Domains"]["Materials"][:2]
        configuration["Boundaries"]["Conductivity"] = [{
            "Attributes": [11, 12], "Conductivity": model["copperConductivity"],
            "Permeability": 1.0, "External": True,
        }]
    return configuration


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("model")
    args = parser.parse_args()
    source = Path(args.model).resolve()
    model = json.loads(source.read_text())
    count = generate_mesh(model, source.parent)
    (source.parent / "palace.json").write_text(
        json.dumps(create_configuration(model, count), indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
