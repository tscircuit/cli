"""Layered copper, dielectric, and plated-hole geometry for the Palace adapter.
This builds physical geometry only; Palace solves Maxwell's equations.
"""
import json
import gmsh
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union
from shapely import set_precision
from shapely.geometry import Point
from shapely.strtree import STRtree
from mesh import points, add_polygon, polygons


def clean(shape):
    return set_precision(shape, grid_size=1e-6)


def nonempty_polygons(shape):
    if shape.is_empty:
        return []
    return [p for p in polygons(shape) if p.area > 1e-12]


def prism(options):
    shape, z_min, z_max = [options[k] for k in ["shape", "zMin", "zMax"]]
    return [entity for polygon in nonempty_polygons(clean(shape))
            for entity in gmsh.model.occ.extrude([add_polygon(polygon, z_min)], 0, 0, z_max - z_min)
            if entity[0] == 3]


def build_layer_copper(model, trace_caps="round"):
    layered = model["multilayer"]
    board = Polygon(points(model["geometry"]["boardOutline"]))
    for cutout in layered["boardCutouts"]:
        board = board.difference(Polygon(points(cutout)))
    if not board.is_valid:
        raise ValueError("Invalid board outline/cutout")
    barrel_shapes = [Polygon(points(barrel["hole"])).buffer(barrel["platingThickness"], join_style="mitre")
                     for barrel in layered["barrels"]]
    barrel_tree = STRtree(barrel_shapes)
    for index, barrel in enumerate(layered["barrels"]):
        outer = barrel_shapes[index]
        for other_index in barrel_tree.query(outer, predicate="intersects"):
            if other_index <= index:
                continue
            other = layered["barrels"][other_index]
            if barrel["netId"] == other["netId"] or min(barrel["zMax"], other["zMax"]) <= max(barrel["zMin"], other["zMin"]):
                continue
            other_outer = barrel_shapes[other_index]
            if outer.intersection(other_outer).area > 1e-10:
                raise ValueError("Different-net plated barrels overlap")
    copper = {}
    for foil in layered["stackup"]["copperLayers"]:
        groups = {}
        for group in layered["copper"]:
            if group["layer"] != foil["name"]:
                continue
            regions, planes = [], []
            for region in group["regions"]:
                shape = Polygon(points(region["outer"]), [points(h) for h in region["holes"]])
                if not shape.is_valid:
                    raise ValueError(f"Invalid copper polygon on {foil['name']} for {group['netId']}")
                (planes if region.get("isPlane") else regions).append(shape)
            strips = [LineString([points([s["start"]])[0], points([s["end"]])[0]])
                      .buffer(s["width"] / 2, quad_segs=8, cap_style=trace_caps, join_style="round")
                      for s in group["segments"]]
            plane = unary_union(planes)
            if not plane.is_empty:
                clearances = unary_union([Polygon(points(barrel["clearance"])) for barrel in layered["barrels"]
                                          if barrel["zMin"] <= foil["zMin"] and barrel["zMax"] >= foil["zMax"]
                                          and group["netId"] != barrel["netId"]])
                plane = plane.difference(clearances)
            groups[group["netId"]] = unary_union([*regions, *strips, plane])
        for barrel in layered["barrels"]:
            if barrel["zMin"] <= foil["zMin"] and barrel["zMax"] >= foil["zMax"]:
                hole = Polygon(points(barrel["hole"]))
                footprint = hole.buffer(barrel["platingThickness"], join_style="mitre").difference(hole)
                if foil["name"] in barrel["layers"]:
                    footprint = unary_union([footprint, Polygon(points(barrel["pads"]))])
                groups[barrel["netId"]] = unary_union([groups.get(barrel["netId"], Polygon()), footprint])
        drilled = unary_union([Polygon(points(drill["hole"])) for drill in layered["drills"]
                               if drill["zMin"] <= foil["zMin"] and drill["zMax"] >= foil["zMax"]])
        for net_id, shape in list(groups.items()):
            shape = shape.difference(drilled)
            if not shape.is_empty and not board.buffer(2e-6).covers(shape):
                raise ValueError(f"Copper for {net_id} on {foil['name']} leaves the PCB")
            groups[net_id] = shape.intersection(board)
        copper[foil["name"]] = groups
    return clean(board), {layer: {net: clean(shape) for net, shape in groups.items()} for layer, groups in copper.items()}


def copper_overlaps(copper):
    """Exact polygon intersections; the spatial index only filters candidates."""
    overlaps = []
    for layer, groups in copper.items():
        names = sorted(groups)
        shapes = [groups[name] for name in names]
        tree = STRtree(shapes)
        for index, shape in enumerate(shapes):
            for other_index in sorted(tree.query(shape, predicate="intersects")):
                if other_index <= index:
                    continue
                overlap = shape.intersection(shapes[other_index])
                if overlap.area > 1e-10:
                    overlaps.append({"layer": layer, "nets": [names[index], names[other_index]],
                                     "areaMm2": overlap.area, "boundsMm": list(overlap.bounds)})
    return overlaps


def layer_copper(model):
    board, copper = build_layer_copper(model)
    overlaps = copper_overlaps(copper)
    if overlaps:
        first = overlaps[0]
        raise ValueError(f"Different nets overlap on {first['layer']}: {', '.join(first['nets'])}; area={first['areaMm2']:.9g} mm², bounds={tuple(first['boundsMm'])}")
    return board, copper



def validate_reference_connectivity(model, copper):
    layered = model["multilayer"]
    reference_net = layered["referenceNetId"]
    nodes = []
    for foil in layered["stackup"]["copperLayers"]:
        for shape in nonempty_polygons(copper[foil["name"]].get(reference_net, Polygon())):
            nodes.append({"shape": shape, "zMin": foil["zMin"], "zMax": foil["zMax"], "layer": foil["name"]})
    for barrel in layered["barrels"]:
        if barrel["netId"] != reference_net:
            continue
        hole = Polygon(points(barrel["hole"]))
        nodes.append({"shape": hole.buffer(barrel["platingThickness"], join_style="mitre").difference(hole),
                      "zMin": barrel["zMin"], "zMax": barrel["zMax"], "layer": None})
    adjacency = [set() for _ in nodes]
    for index, node in enumerate(nodes):
        for other_index in range(index + 1, len(nodes)):
            other = nodes[other_index]
            if min(node["zMax"], other["zMax"]) < max(node["zMin"], other["zMin"]) - 1e-8:
                continue
            if node["shape"].buffer(2e-6).intersection(other["shape"]).area > 1e-10:
                adjacency[index].add(other_index)
                adjacency[other_index].add(index)
    connected = None
    for port in model["ports"]:
        contact = Point(port["reference"]["x"], port["reference"]["y"])
        candidates = [index for index, node in enumerate(nodes) if node["layer"] == port["referenceLayer"] and Polygon(node["shape"].exterior).buffer(2e-6).covers(contact)]
        if len(candidates) != 1:
            raise ValueError("Reference terminal must identify one physical copper region")
        reached, pending = set(), candidates.copy()
        while pending:
            index = pending.pop()
            if index in reached:
                continue
            reached.add(index)
            pending.extend(adjacency[index] - reached)
        if not any(nodes[index]["layer"] == layered["sampleLayer"] for index in reached):
            raise ValueError("Reference pad is not physically connected to the sampled reference layer; supply real traces/vias")
        if connected is not None and not reached.intersection(connected):
            raise ValueError("Reference terminals are on disconnected copper islands")
        connected = reached


def port_surface(options):
    model, port, neighbor, copper, board = [options[k] for k in ["model", "port", "neighbor", "copper", "board"]]
    signal, reference = port["signal"], port["reference"]
    dx, dy = reference["x"] - signal["x"], reference["y"] - signal["y"]
    if abs(dx) + abs(dy) < 1e-9:
        dx, dy = neighbor["x"] - signal["x"], neighbor["y"] - signal["y"]
    length = (dx * dx + dy * dy) ** 0.5
    if length < 1e-9:
        raise ValueError("Port endpoint needs a nonzero neighboring route segment")
    tx, ty = -dy / length * model["portWidth"] / 2, dx / length * model["portWidth"] / 2
    corners = [(signal["x"] - tx, signal["y"] - ty, port["signalZ"]),
               (signal["x"] + tx, signal["y"] + ty, port["signalZ"]),
               (reference["x"] + tx, reference["y"] + ty, port["referenceZ"]),
               (reference["x"] - tx, reference["y"] - ty, port["referenceZ"])]
    signal_shapes = unary_union(list(copper[port["signalLayer"]].values()))
    reference_shapes = copper[port["referenceLayer"]].get(model["multilayer"]["referenceNetId"], Polygon())
    if not signal_shapes.buffer(2e-6).covers(LineString([c[:2] for c in corners[:2]])):
        raise ValueError("Port aperture leaves signal copper")
    coplanar = abs(port["signalZ"] - port["referenceZ"]) < 1e-9
    reference_contact_shapes = unary_union([Polygon(p.exterior) for p in nonempty_polygons(reference_shapes)]) if coplanar else reference_shapes
    if not reference_contact_shapes.buffer(2e-6).covers(LineString([c[:2] for c in corners[2:]])):
        raise ValueError("Port aperture leaves reference copper; specify a physical reference pin")
    if coplanar:
        patch = Polygon([c[:2] for c in corners]).difference(unary_union([signal_shapes, reference_contact_shapes]))
        if patch.geom_type != "Polygon" or patch.is_empty or len(patch.interiors):
            raise ValueError("Coplanar port needs one clear dielectric gap")
        signal_net = options["signalNetId"]
        intended_signal = copper[port["signalLayer"]][signal_net]
        if patch.boundary.intersection(intended_signal.boundary.buffer(2e-6)).length < model["portWidth"] * 0.9 or patch.boundary.intersection(reference_shapes.boundary.buffer(2e-6)).length < model["portWidth"] * 0.9:
            raise ValueError(f"Coplanar port does not contact both intended conductors: signal={patch.boundary.intersection(intended_signal.boundary.buffer(2e-6)).length}, reference={patch.boundary.intersection(reference_shapes.boundary.buffer(2e-6)).length}, width={model['portWidth']}")
        if not board.covers(patch):
            raise ValueError("Port crosses board cutout/edge")
        return add_polygon(patch, port["signalZ"])
    validate_aperture({"model": model, "port": port, "corners": corners, "copper": copper, "board": board})
    vertices = [gmsh.model.occ.addPoint(*c) for c in corners]
    edges = [gmsh.model.occ.addLine(vertices[i], vertices[(i + 1) % 4]) for i in range(4)]
    return (2, gmsh.model.occ.addPlaneSurface([gmsh.model.occ.addCurveLoop(edges)]))



def projected_aperture(options):
    port, z_min, z_max, corners = [options[k] for k in ["port", "zMin", "zMax", "corners"]]
    a = max(z_min, min(port["signalZ"], port["referenceZ"]))
    b = min(z_max, max(port["signalZ"], port["referenceZ"]))
    if b - a <= 1e-8:
        return Polygon()
    coordinates = []
    for z in [a, b]:
        fraction = (z - port["signalZ"]) / (port["referenceZ"] - port["signalZ"])
        for source, target in [(corners[0], corners[3]), (corners[1], corners[2])]:
            coordinates.append((source[0] + fraction * (target[0] - source[0]),
                                source[1] + fraction * (target[1] - source[1])))
    from shapely.geometry import MultiPoint
    return MultiPoint(coordinates).convex_hull


def validate_aperture(options):
    model, port, corners, copper, board = [options[k] for k in ["model", "port", "corners", "copper", "board"]]
    from shapely.geometry import MultiPoint
    footprint = MultiPoint([c[:2] for c in corners]).convex_hull
    if not board.buffer(2e-6).covers(footprint):
        raise ValueError("Port aperture crosses a physical PCB cutout/edge")
    for foil in model["multilayer"]["stackup"]["copperLayers"]:
        patch = projected_aperture({"port": port, "zMin": foil["zMin"], "zMax": foil["zMax"], "corners": corners})
        copper_shape = unary_union(list(copper[foil["name"]].values()))
        intersection = patch.intersection(copper_shape)
        if intersection.area > 1e-10 or (patch.geom_type == "LineString" and intersection.length > 1e-7):
            raise ValueError("Port aperture passes through intermediate copper; select closer explicit reference pins")
    for barrel in model["multilayer"]["barrels"]:
        patch = projected_aperture({"port": port, "zMin": barrel["zMin"], "zMax": barrel["zMax"], "corners": corners})
        hole = Polygon(points(barrel["hole"]))
        annulus = hole.buffer(barrel["platingThickness"], join_style="mitre").difference(hole)
        intersection = patch.intersection(annulus)
        if intersection.area > 1e-10 or (patch.geom_type == "LineString" and intersection.length > 1e-7):
            raise ValueError("Port aperture passes through a plated barrel; select a clear terminal gap")


def generate_multilayer_mesh(model, destination):
    layered = model["multilayer"]
    board, planar_copper = layer_copper(model)
    validate_reference_connectivity(model, planar_copper)
    gmsh.initialize()
    try:
        gmsh.option.setNumber("Geometry.Tolerance", 1e-6)
        gmsh.option.setNumber("Geometry.ToleranceBoolean", 1e-6)
        gmsh.model.add("multilayer-return-current")
        foil_layers = layered["stackup"]["copperLayers"]
        bottom, top = foil_layers[-1], foil_layers[0]
        copper_by_net = {}
        for foil in foil_layers:
            for net_id, shape in planar_copper[foil["name"]].items():
                copper_by_net.setdefault(net_id, []).extend(prism({"shape": shape, "zMin": foil["zMin"], "zMax": foil["zMax"]}))
        for barrel in layered["barrels"]:
            hole = Polygon(points(barrel["hole"]))
            outer = hole.buffer(barrel["platingThickness"], join_style="mitre")
            pads = Polygon(points(barrel["pads"]))
            if not pads.buffer(2e-6).covers(outer) or not board.covers(pads):
                raise ValueError("Plated barrel does not fit its pad/board")
            copper_by_net.setdefault(barrel["netId"], []).extend(prism({"shape": outer.difference(hole), "zMin": barrel["zMin"], "zMax": barrel["zMax"]}))
        copper = []
        for net_id, volumes in copper_by_net.items():
            if len(volumes) > 1:
                volumes, _ = gmsh.model.occ.fuse(volumes[:1], volumes[1:])
            copper.extend(volumes)
        if not copper:
            raise ValueError("Empty copper model")
        # Dielectrics occupy the resin around patterned inner foil too. The
        # fragments occupied by metal are removed from dielectric attributes.
        dielectric_volumes = []
        dielectric_counts = []
        for slab in layered["stackup"]["dielectrics"]:
            z_min = slab["zMin"]
            lower = next((foil for foil in foil_layers if abs(foil["zMax"] - z_min) < 1e-8), None)
            if lower and lower["name"] != "bottom":
                z_min = lower["zMin"]
            shape = board
            # Blind/buried holes remove only their physical depth. Split slabs at
            # drill endpoints so unused layers remain intact.
            boundaries = sorted({z_min, slab["zMax"], *[z for drill in layered["drills"] for z in [drill["zMin"], drill["zMax"]]]})
            volumes = []
            for a, b in zip(boundaries, boundaries[1:]):
                if a < z_min - 1e-9 or b > slab["zMax"] + 1e-9:
                    continue
                shape = board
                for drill in layered["drills"]:
                    if drill["zMin"] <= a and drill["zMax"] >= b:
                        shape = shape.difference(Polygon(points(drill["hole"])))
                volumes.extend(prism({"shape": shape, "zMin": a, "zMax": b}))
            dielectric_volumes.extend(volumes)
            dielectric_counts.append((slab["attribute"], len(volumes)))
        min_x, min_y, max_x, max_y = board.bounds
        padding = model["airPadding"]
        air = (3, gmsh.model.occ.addBox(min_x - padding, min_y - padding, bottom["zMin"] - padding,
                                      max_x - min_x + 2 * padding, max_y - min_y + 2 * padding,
                                      top["zMax"] - bottom["zMin"] + 2 * padding))
        legacy = []
        for trace in model["geometry"]["signals"]:
            wires = [p for p in trace["route"] if p["route_type"] == "wire"]
            for endpoint, route in [(wires[0], wires[1:]), (wires[-1], list(reversed(wires[:-1])))]:
                neighbor = next((p for p in route if abs(p["x"] - endpoint["x"]) + abs(p["y"] - endpoint["y"]) > 1e-9), None)
                if not neighbor:
                    raise ValueError("Trace needs a nonzero segment for its terminal orientation")
                legacy.append(neighbor)
        port_surfaces = []
        for index, port in enumerate(model["ports"]):
            # Find signal owner by the endpoint's copper. Named PCB pin ownership
            # was already validated by the TS model builder.
            endpoint = port["signal"]
            owners = [net for net, shape in planar_copper[port["signalLayer"]].items()
                      if shape.buffer(2e-6).covers(Point(endpoint["x"], endpoint["y"]))]
            if len(owners) != 1 or owners[0] == layered["referenceNetId"]:
                raise ValueError("Signal terminal must contact exactly one non-reference conductor")
            surface = port_surface({"model": model, "port": port, "neighbor": legacy[index],
                                    "copper": planar_copper, "board": board, "signalNetId": owners[0]})
            port_surfaces.append(surface)
        tools = [*dielectric_volumes, *copper, *port_surfaces]
        _, mapping = gmsh.model.occ.fragment([air], tools)
        gmsh.model.occ.synchronize()
        copper_offset = 1 + len(dielectric_volumes)
        copper_tags = {tag for desc in mapping[copper_offset:copper_offset + len(copper)] for dim, tag in desc if dim == 3}
        gmsh.model.addPhysicalGroup(3, sorted(copper_tags), 3, "copper")
        dielectric_tags = set()
        offset = 1
        for attribute, count in dielectric_counts:
            tags = {tag for desc in mapping[offset:offset + count] for dim, tag in desc if dim == 3} - copper_tags
            if not tags:
                raise ValueError("Empty dielectric slab")
            if tags.intersection(dielectric_tags):
                raise ValueError("Overlapping dielectric slabs")
            gmsh.model.addPhysicalGroup(3, sorted(tags), attribute, f"dielectric-{attribute}")
            dielectric_tags.update(tags)
            offset += count
        air_tags = {tag for dim, tag in mapping[0] if dim == 3} - dielectric_tags - copper_tags
        gmsh.model.addPhysicalGroup(3, sorted(air_tags), 1, "air")
        port_tags = []
        for index, desc in enumerate(mapping[copper_offset + len(copper):]):
            tags = [tag for dim, tag in desc if dim == 2]
            if not tags or set(tags).intersection(port_tags):
                raise ValueError("Lumped ports overlap or have no surface")
            gmsh.model.addPhysicalGroup(2, tags, 21 + index, f"port-{index + 1}")
            port_tags.extend(tags)
        outer = [tag for dim, tag in gmsh.model.getBoundary([(3, tag) for tag in sorted(air_tags | dielectric_tags | copper_tags)], combined=True, oriented=False) if dim == 2]
        gmsh.model.addPhysicalGroup(2, outer, 13, "outer-air")
        # Avoid tagging exposed drilled/board surfaces as absorbing boundaries.
        # The combined boundary is the air enclosure, since voids are filled by air.
        copper_surfaces = [tag for dim, tag in gmsh.model.getBoundary([(3, tag) for tag in copper_tags], combined=False, oriented=False) if dim == 2]
        edges = sorted({tag for dim, tag in gmsh.model.getBoundary([(2, tag) for tag in [*copper_surfaces, *port_tags]], combined=False, oriented=False) if dim == 1})
        distance = gmsh.model.mesh.field.add("Distance")
        gmsh.model.mesh.field.setNumbers(distance, "CurvesList", edges)
        gmsh.model.mesh.field.setNumber(distance, "Sampling", 50)
        threshold = gmsh.model.mesh.field.add("Threshold")
        for key, number in {"InField": distance, "SizeMin": min(model["meshSize"] / 3, model["portWidth"] / 2), "SizeMax": model["meshSize"], "DistMin": 0.05, "DistMax": 0.8}.items():
            gmsh.model.mesh.field.setNumber(threshold, key, number)
        gmsh.model.mesh.field.setAsBackgroundMesh(threshold)
        for key, number in {"Mesh.MeshSizeExtendFromBoundary": 0, "Mesh.MeshSizeFromPoints": 0,
                            "Mesh.MeshSizeFromCurvature": 0, "Mesh.Algorithm3D": 1,
                            "General.NumThreads": 1, "Mesh.MshFileVersion": 2.2}.items():
            gmsh.option.setNumber(key, number)
        gmsh.model.mesh.generate(3)
        gmsh.write(str(destination / "mesh.msh"))
        tetrahedra = [int(tag) for tags in gmsh.model.mesh.getElements(3)[1] for tag in tags]
        qualities = gmsh.model.mesh.getElementQualities(tetrahedra, "minSICN")
        minimum_quality = float(min(qualities))
        if not minimum_quality > 1e-8:
            raise ValueError(f"Degenerate/inverted tetrahedra: min SICN={minimum_quality}")
        summary = {"minimumSicn": minimum_quality, "geometryPrecisionMm": 1e-6, "nodes": len(gmsh.model.mesh.getNodes()[0]),
                   "tetrahedra": sum(len(tags) for tags in gmsh.model.mesh.getElements(3)[1]),
                   "copperVolumeMm3": sum(gmsh.model.occ.getMass(3, tag) for tag in copper_tags),
                   "dielectricAttributes": [a for a, _ in dielectric_counts],
                   "portAttributes": list(range(21, 21 + len(port_surfaces))),
                   "sampleLayer": layered["sampleLayer"]}
        (destination / "mesh-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    finally:
        gmsh.finalize()
    return len(model["ports"])
