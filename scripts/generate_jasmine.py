import bpy
import bmesh
import math
from mathutils import Vector, Euler, Matrix

# Clear all existing objects in the scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# ----------------- MATERIALS -----------------
# 1. Jasmine Petals Material
mat_petal = bpy.data.materials.new(name="JasminePetal")
mat_petal.use_nodes = True
nodes_petal = mat_petal.node_tree.nodes
links_petal = mat_petal.node_tree.links
bsdf_petal = nodes_petal.get("Principled BSDF")
if bsdf_petal:
    # Blender 4.x / 5.x Principled BSDF inputs
    if "Base Color" in bsdf_petal.inputs:
        bsdf_petal.inputs["Base Color"].default_value = (0.975, 0.970, 0.955, 1.0) # Pure ivory white
    if "Roughness" in bsdf_petal.inputs:
        bsdf_petal.inputs["Roughness"].default_value = 0.38
    if "Subsurface Weight" in bsdf_petal.inputs:
        bsdf_petal.inputs["Subsurface Weight"].default_value = 0.25
    elif "Subsurface" in bsdf_petal.inputs:
        bsdf_petal.inputs["Subsurface"].default_value = 0.25
    if "Subsurface Radius" in bsdf_petal.inputs:
        bsdf_petal.inputs["Subsurface Radius"].default_value = (1.0, 0.9, 0.7)
    if "Sheen Weight" in bsdf_petal.inputs:
        bsdf_petal.inputs["Sheen Weight"].default_value = 0.75
    elif "Sheen" in bsdf_petal.inputs:
        bsdf_petal.inputs["Sheen"].default_value = 0.75
    if "Sheen Roughness" in bsdf_petal.inputs:
        bsdf_petal.inputs["Sheen Roughness"].default_value = 0.4

# 2. Jasmine Center / Stamen Material
mat_center = bpy.data.materials.new(name="JasmineCenter")
mat_center.use_nodes = True
bsdf_center = mat_center.node_tree.nodes.get("Principled BSDF")
if bsdf_center:
    if "Base Color" in bsdf_center.inputs:
        bsdf_center.inputs["Base Color"].default_value = (1.0, 0.86, 0.42, 1.0) # Golden-yellow pollen
    if "Roughness" in bsdf_center.inputs:
        bsdf_center.inputs["Roughness"].default_value = 0.45
    if "Emission Color" in bsdf_center.inputs:
        bsdf_center.inputs["Emission Color"].default_value = (0.95, 0.78, 0.35, 1.0)
    if "Emission Strength" in bsdf_center.inputs:
        bsdf_center.inputs["Emission Strength"].default_value = 0.4

# 3. Jasmine Calyx & Stem Material
mat_green = bpy.data.materials.new(name="JasmineGreenery")
mat_green.use_nodes = True
bsdf_green = mat_green.node_tree.nodes.get("Principled BSDF")
if bsdf_green:
    if "Base Color" in bsdf_green.inputs:
        bsdf_green.inputs["Base Color"].default_value = (0.16, 0.38, 0.12, 1.0) # Fresh emerald green
    if "Roughness" in bsdf_green.inputs:
        bsdf_green.inputs["Roughness"].default_value = 0.48

# ----------------- GEOMETRY -----------------
# Create a single detailed petal mesh with organic curvature
def create_petal_mesh(name="Petal"):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    # Create grid for petal surface: 7 length segments, 5 width segments
    rows = 8
    cols = 6
    grid = []

    for r in range(rows):
        v_row = []
        t_len = r / (rows - 1) # 0 (base) to 1 (tip)

        # Width profile: narrow at corolla, swells broad at mid, slight taper to tip
        width_factor = math.sin(t_len * math.pi) * 0.055
        if t_len > 0.6:
            # Rounded ovate apex
            width_factor = math.sin((1.0 - t_len) * 2.5) * 0.065

        # Longitudinal arch (petal curves gently downward and outward)
        z_arch = -math.sin(t_len * math.pi * 0.8) * 0.018 - (t_len ** 2) * 0.012
        y_pos = t_len * 0.14 # Length ~ 0.14m

        for c in range(cols):
            t_w = (c / (cols - 1)) * 2.0 - 1.0 # -1 to 1
            x_pos = t_w * width_factor

            # Lateral cupping curvature (transverse curve like a spoon)
            z_cup = (t_w ** 2) * 0.008

            # Wavy edge flutter
            flutter = math.sin(t_len * 12.0) * (abs(t_w) ** 2) * 0.003

            v = bm.verts.new((x_pos, y_pos, z_arch + z_cup + flutter))
            v_row.append(v)
        grid.append(v_row)

    bm.verts.ensure_lookup_table()

    # Create faces
    for r in range(rows - 1):
        for c in range(cols - 1):
            bm.faces.new((
                grid[r][c],
                grid[r + 1][c],
                grid[r + 1][c + 1],
                grid[r][c + 1]
            ))

    bm.to_mesh(mesh)
    bm.free()
    return mesh

# ----------------- ASSEMBLE JASMINE FLOWER -----------------
# 1. Corolla tube at center
bpy.ops.mesh.primitive_cylinder_add(
    vertices=16,
    radius=0.014,
    depth=0.038,
    location=(0, 0, -0.015)
)
tube_obj = bpy.context.active_object
tube_obj.name = "CorollaTube"
tube_obj.data.materials.append(mat_petal)

# 2. Central stamen / throat
bpy.ops.mesh.primitive_uv_sphere_add(
    segments=16,
    ring_count=12,
    radius=0.011,
    location=(0, 0, 0.002)
)
stamen_obj = bpy.context.active_object
stamen_obj.name = "Stamen"
stamen_obj.scale = (1.0, 1.0, 0.5)
bpy.ops.object.transform_apply(scale=True)
stamen_obj.data.materials.append(mat_center)

# 3. Create 7 star petals radiating outward
num_petals = 7
petal_objs = []
base_petal_mesh = create_petal_mesh("JasminePetalBase")

for i in range(num_petals):
    angle = (i / num_petals) * math.pi * 2.0
    obj = bpy.data.objects.new(f"Petal_{i}", base_petal_mesh.copy())
    bpy.context.collection.objects.link(obj)

    # Position at rim of corolla
    rad_offset = 0.012
    obj.location = (math.cos(angle) * rad_offset, math.sin(angle) * rad_offset, 0.001)

    # Rotation: point outward radially with gentle upward/downward flair and slight tilt
    tilt_flare = 0.22 + (i % 3) * 0.04
    twist = 0.08 * (1 if i % 2 == 0 else -1)
    obj.rotation_euler = Euler((tilt_flare, twist, angle - math.pi * 0.5), 'ZXY')

    # Add materials and modifiers
    obj.data.materials.append(mat_petal)

    # Add subtle solidify so petals have physical thickness and catch light on both sides
    mod_solid = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    mod_solid.thickness = 0.0015
    mod_solid.offset = 0

    # Smooth shading
    for poly in obj.data.polygons:
        poly.use_smooth = True

    petal_objs.append(obj)

# 4. Calyx with 6 slender pointed green sepals
for i in range(6):
    s_angle = (i / 6.0) * math.pi * 2.0
    bpy.ops.mesh.primitive_cone_add(
        vertices=6,
        radius1=0.0035,
        radius2=0.0005,
        depth=0.022,
        location=(math.cos(s_angle) * 0.013, math.sin(s_angle) * 0.013, -0.014)
    )
    sepal = bpy.context.active_object
    sepal.name = f"Sepal_{i}"
    sepal.rotation_euler = Euler((0.45, 0, s_angle - math.pi * 0.5), 'ZXY')
    sepal.data.materials.append(mat_green)
    petal_objs.append(sepal)

# 5. Slender curved green stem
bpy.ops.mesh.primitive_cylinder_add(
    vertices=12,
    radius=0.004,
    depth=0.08,
    location=(0.005, 0.003, -0.065)
)
stem_obj = bpy.context.active_object
stem_obj.name = "Stem"
stem_obj.rotation_euler = (0.08, -0.06, 0.2)
stem_obj.data.materials.append(mat_green)

# Join into single unified Jasmine flower model
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = tube_obj
bpy.ops.object.join()

final_jasmine = bpy.context.active_object
final_jasmine.name = "JasmineFlower"

# Ensure smooth normals across all joined geometry
bpy.ops.object.shade_smooth()

# Auto-center and normalize bounds
bbox = [final_jasmine.matrix_world @ Vector(corner) for corner in final_jasmine.bound_box]
min_z = min(v.z for v in bbox)
max_z = max(v.z for v in bbox)
center_x = sum(v.x for v in bbox) / len(bbox)
center_y = sum(v.y for v in bbox) / len(bbox)

# Center the blossom head at origin
final_jasmine.location = (-center_x, -center_y, -0.0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ----------------- EXPORT TO GLTF/GLB -----------------
export_path = "e:/Deepak/practice/bloom-of-love/public/models/jasmine.glb"
print(f"Exporting Jasmine model to {export_path}...")

bpy.ops.export_scene.gltf(
    filepath=export_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True
)

print("Jasmine GLB export completed successfully!")
