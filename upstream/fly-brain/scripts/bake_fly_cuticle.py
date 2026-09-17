"""Bake a seamless, packed cuticle texture in Blender for Cycles and WebGL.
R: surface relief; G: roughness; B: pigment variation. Values are linear data, not sRGB colour.
blender -b --factory-startup --python scripts/bake_fly_cuticle.py
"""
from pathlib import Path
import math
import bpy

root = Path(__file__).resolve().parents[1]
out = root / 'public/body/cuticle_detail.png'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=2)
plane = bpy.context.object
m = bpy.data.materials.new('Packed cuticle · periodic cellular microsculpture')
m.use_nodes = True
t = m.node_tree; t.nodes.clear()


def node(kind): return t.nodes.new(kind)


def math_node(op, a, b=None):
    n = node('ShaderNodeMath'); n.operation = op
    for i, value in enumerate((a, b)):
        if value is None: continue
        if isinstance(value, (float, int)): n.inputs[i].default_value = value
        else: t.links.new(value, n.inputs[i])
    return n.outputs[0]


uv = node('ShaderNodeTexCoord'); xyz = node('ShaderNodeSeparateXYZ')
t.links.new(uv.outputs['UV'], xyz.inputs[0])
u = math_node('MULTIPLY', xyz.outputs['X'], 2*math.pi)
v = math_node('MULTIPLY', xyz.outputs['Y'], 2*math.pi)
# Torus coordinates have identical values and derivatives at all four tile borders.
radius = math_node('ADD', 1., math_node('MULTIPLY', math_node('COSINE', v), .32))
co = node('ShaderNodeCombineXYZ')
t.links.new(math_node('MULTIPLY', math_node('COSINE', u), radius), co.inputs[0])
t.links.new(math_node('MULTIPLY', math_node('SINE', u), radius), co.inputs[1])
t.links.new(math_node('MULTIPLY', math_node('SINE', v), .32), co.inputs[2])
cells = node('ShaderNodeTexVoronoi'); cells.feature = 'DISTANCE_TO_EDGE'
cells.inputs['Scale'].default_value = 13
t.links.new(co.outputs[0], cells.inputs['Vector'])
grain = node('ShaderNodeTexNoise'); grain.inputs['Scale'].default_value = 26; grain.inputs['Detail'].default_value = 2
t.links.new(co.outputs[0], grain.inputs['Vector'])
pigment = node('ShaderNodeTexNoise'); pigment.inputs['Scale'].default_value = 1.1; pigment.inputs['Detail'].default_value = 2
t.links.new(co.outputs[0], pigment.inputs['Vector'])
packed = node('ShaderNodeCombineXYZ')
height = math_node('ADD', math_node('MULTIPLY', cells.outputs['Distance'], 2.6), math_node('MULTIPLY', grain.outputs['Fac'], .24))
t.links.new(height, packed.inputs['X'])
t.links.new(math_node('ADD', .22, math_node('MULTIPLY', grain.outputs['Fac'], .48)), packed.inputs['Y'])
t.links.new(pigment.outputs['Fac'], packed.inputs['Z'])
emission = node('ShaderNodeEmission'); t.links.new(packed.outputs[0], emission.inputs['Color'])
output = node('ShaderNodeOutputMaterial'); t.links.new(emission.outputs[0], output.inputs['Surface'])
plane.data.materials.append(m)
bpy.ops.object.camera_add(location=(0, 0, 1))
camera = bpy.context.object; camera.data.type = 'ORTHO'; camera.data.ortho_scale = 2
scene = bpy.context.scene; scene.camera = camera; scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'; scene.cycles.samples = 16; scene.cycles.use_denoising = False
scene.render.resolution_x = scene.render.resolution_y = 512; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Raw'
scene.render.filepath = str(out)
scene.render.film_transparent = False
depths = {output: 0}; pending = [output]
while pending:
    current = pending.pop(0)
    for socket in current.inputs:
        for link in socket.links:
            depth = depths[current] + 1
            if depths.get(link.from_node, -1) < depth:
                depths[link.from_node] = depth; pending.append(link.from_node)
rows = {}
for n, depth in sorted(depths.items(), key=lambda item: item[1]):
    row = rows.get(depth, 0); rows[depth] = row + 1
    n.location = (-depth*240, -row*330); n.width = 195
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art/fly/cuticle-bake.blend'))
bpy.ops.render.render(write_still=True)
print('PACKED_CUTICLE', out, flush=True)
