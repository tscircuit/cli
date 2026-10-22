"""Import Palace's actual finite-conductivity boundary current coefficients."""
import xml.etree.ElementTree as ET
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy


def read_boundary(path):
    pieces = [path.parent / piece.attrib["Source"] for piece in ET.parse(path).iter("Piece")]
    readers, append = [], vtk.vtkAppendFilter()
    append.MergePointsOff()
    for piece in pieces:
        reader = vtk.vtkXMLUnstructuredGridReader()
        reader.SetFileName(str(piece))
        reader.Update()
        readers.append(reader)
        append.AddInputData(reader.GetOutput())
    if not readers:
        raise ValueError("No Palace boundary pieces")
    append.Update()
    return append.GetOutput()


def probe_face(boundary, coordinates, z, receipt=None):
    attribute = boundary.GetCellData().GetArray("attribute")
    if attribute is None:
        raise ValueError("Palace boundary has no material-face attributes")
    ids = vtk.vtkIdList()
    attributes = vtk_to_numpy(attribute)
    face_heights = []
    for index in np.flatnonzero(attributes == 11):
        cell = boundary.GetCell(int(index))
        if all(abs(cell.GetPoints().GetPoint(point)[2] - z) < 1e-7 for point in range(cell.GetNumberOfPoints())):
            ids.InsertNextId(int(index))
            face_heights.extend(cell.GetPoints().GetPoint(point)[2] for point in range(cell.GetNumberOfPoints()))
    if ids.GetNumberOfIds() == 0:
        if receipt is not None:
            receipt.update({"physicalZMm": z, "triangles": 0, "validSamples": 0})
        return np.zeros((len(coordinates), 2), dtype=complex), np.zeros(len(coordinates), dtype=bool)
    extract = vtk.vtkExtractCells()
    extract.SetInputData(boundary)
    extract.SetCellList(ids)
    extract.Update()
    # Palace writes float32 VTK coordinates. For a flat triangle locator its
    # bounding box can reject the exact physical double-precision Z before the
    # probe tolerance is applied (e.g. -0.035 versus -0.035000000149). Probe the
    # verified exported face plane, without moving XY or filling absent faces.
    probe_z = float(np.mean(face_heights))
    if max(face_heights) - min(face_heights) > 1e-10:
        raise ValueError("Selected Palace foil face is not planar")
    locations = vtk.vtkPoints()
    locations.SetData(numpy_to_vtk(np.column_stack([coordinates, np.full(len(coordinates), probe_z)]), deep=True))
    points = vtk.vtkPolyData()
    points.SetPoints(locations)
    probe = vtk.vtkProbeFilter()
    probe.SetInputData(points)
    probe.SetSourceData(extract.GetOutput())
    probe.SetCellLocatorPrototype(vtk.vtkStaticCellLocator())
    probe.SetComputeTolerance(False)
    probe.SetTolerance(1e-5)
    probe.Update()
    data = probe.GetOutput().GetPointData()
    valid = vtk_to_numpy(data.GetArray("vtkValidPointMask")).astype(bool)
    real, imag = data.GetArray("J_s_real"), data.GetArray("J_s_imag")
    if real is None or imag is None:
        raise ValueError("Palace did not export J_s_real/J_s_imag finite-conductivity boundary currents")
    current = vtk_to_numpy(real)[:, :2] + 1j * vtk_to_numpy(imag)[:, :2]
    if not np.isfinite(current[valid]).all():
        raise ValueError("Non-finite Palace surface current")
    current[~valid] = 0
    if receipt is not None:
        receipt.update({"physicalZMm": z, "exportedZMm": probe_z, "triangles": ids.GetNumberOfIds(), "validSamples": int(np.count_nonzero(valid))})
    return current, valid


def sample_surface(path, coordinates, model, scale_amps_per_mm, receipts=None):
    boundary = read_boundary(path)
    top_receipt, bottom_receipt = {}, {}
    top, top_valid = probe_face(boundary, coordinates, 0, top_receipt)
    bottom, bottom_valid = probe_face(boundary, coordinates, -model["copperThickness"], bottom_receipt)
    if not (top_valid | bottom_valid).all():
        raise ValueError(f"{np.count_nonzero(~(top_valid | bottom_valid))} declared conductor samples have no exposed foil face")
    if receipts is not None:
        receipts.append({"attribute": 11, "fieldArrays": ["J_s_real", "J_s_imag"], "scaleAmpsPerMm": scale_amps_per_mm, "declaredConductorSamples": len(coordinates), "bothFaces": int(np.count_nonzero(top_valid & bottom_valid)), "oneFace": int(np.count_nonzero(top_valid ^ bottom_valid)), "faces": [top_receipt, bottom_receipt]})
    # J_s is n_out_of_metal × H, already signed on each exterior face. Sum the
    # two physical currents; no extra normal/sign flip. A buried via junction
    # may expose only one face and contributes only that physical face.
    return (top + bottom) * scale_amps_per_mm
