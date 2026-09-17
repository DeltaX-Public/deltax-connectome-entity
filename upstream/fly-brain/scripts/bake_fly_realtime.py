"""Export the Cycles scene as an articulated, shaded 3D asset, not camera images.

blender -b art/fly/fly-full-body.blend --python scripts/bake_fly_realtime.py -- --samples 128
Diffuse lighting (including Cycles' subsurface contribution) is baked per vertex.
Glossy reflections remain view-dependent in WebGL. Hairs retain instancing there.
"""
import argparse
import gzip
import json
import math
from pathlib import Path
import sys
import time

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--samples', type=int, default=128)
parser.add_argument('--output', default='/tmp/fly-blender/baked')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
started = time.monotonic()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'; prefs.get_devices()
for device in prefs.devices: device.use = device.type == 'METAL'
scene.cycles.device = 'GPU'
scene.cycles.samples = args.samples
scene.cycles.use_adaptive_sampling = False
source = json.loads((ROOT / 'public/body/fly_hd.json').read_text())
parts = []
bpy.ops.object.select_all(action='DESELECT')
for part in source['parts']:
    ob = bpy.data.objects[part['geom']]
    # Apply exactly the silhouette smoothing used by the approved Cycles render.
    bpy.context.view_layer.objects.active = ob
    for modifier in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
    if 'membrane' not in ob.name:
        col = ob.data.color_attributes.new(name='Cycles diffuse irradiance', type='FLOAT_COLOR', domain='POINT')
        ob.data.color_attributes.active_color = col
        ob.select_set(True)
    parts.append((part, ob))
extras = json.loads((Path('/tmp/fly-blender/appearance.json')).read_text())
hair_objects = []; occurrences = {}
for batch in extras['hairs']:
    if not batch['count']: continue
    name = batch['name']; occurrence = occurrences.get(name, 0); occurrences[name] = occurrence + 1
    ob = bpy.data.objects[name if occurrence == 0 else name + f'.{occurrence:03d}']
    assert len(ob.data.vertices) == batch['count'] * len(extras['hairTemplate']['positions']) // 3, name
    col = ob.data.color_attributes.new(name='Cycles hair irradiance', type='FLOAT_COLOR', domain='POINT')
    ob.data.color_attributes.active_color = col; ob.select_set(True)
    hair_objects.append((batch, ob))
bpy.context.view_layer.objects.active = bpy.data.objects['head']
print('BAKING', sum(len(o.data.vertices) for _, o in parts), 'vertices', flush=True)
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')

binary = bytearray()
def append(array):
    while len(binary) % 4: binary.append(0)
    offset = len(binary); binary.extend(array.tobytes()); return offset

result = {'version': 1, 'generator': 'Blender ' + bpy.app.version_string + ' / Cycles',
          'samples': args.samples, 'lighting': 'Diffuse direct + indirect, including subsurface scattering; glossy is evaluated live',
          'poses': source['poses'], 'parents': source['parents'], 'parts': [], 'hairs': [], 'lights': []}
for original, ob in parts:
    mesh = ob.data; mesh.calc_loop_triangles()
    positions = np.empty(len(mesh.vertices)*3, dtype='<f4'); mesh.vertices.foreach_get('co', positions)
    normals = np.empty(len(mesh.vertices)*3, dtype='<f4'); mesh.vertices.foreach_get('normal', normals)
    indices = np.empty(len(mesh.loop_triangles)*3, dtype='<u4'); mesh.loop_triangles.foreach_get('vertices', indices)
    col = mesh.color_attributes.active_color
    if col:
        irradiance = np.empty(len(mesh.vertices)*4, dtype='<f4'); col.data.foreach_get('color', irradiance)
        irradiance = np.maximum(irradiance.reshape(-1, 4)[:, :3], 0).astype('<f2')
    else: irradiance = np.ones((len(mesh.vertices), 3), dtype='<f2')
    mat = ob.data.materials[0]; p = mat.node_tree.nodes.get('Principled BSDF')
    entry = {**original, 'vOff': append(positions), 'vCount': len(mesh.vertices),
             'iOff': append(indices), 'iCount': len(indices),
             'nOff': append(np.round(np.clip(normals, -1, 1)*32767).astype('<i2')),
             'lightOff': append(irradiance),
             'surface': {'name': mat.name, 'color': list(p.inputs['Base Color'].default_value[:3]),
                         'roughness': p.inputs['Roughness'].default_value,
                         'ior': p.inputs['IOR'].default_value,
                         'coat': p.inputs['Coat Weight'].default_value,
                         'coatRoughness': p.inputs['Coat Roughness'].default_value}}
    result['parts'].append(entry)
for batch, ob in hair_objects:
    col = ob.data.color_attributes.active_color
    irradiance = np.empty(len(col.data)*4, dtype='<f4'); col.data.foreach_get('color', irradiance)
    irradiance = irradiance.reshape(batch['count'], -1, 4)[:, :, :3].mean(axis=1)
    result['hairs'].append({'name': batch['name'], 'count': batch['count'], 'lightOff': append(np.maximum(irradiance, 0).astype('<f2'))})
for ob in scene.objects:
    if ob.type == 'LIGHT' and ob.data.type == 'AREA':
        result['lights'].append({'name': ob.name, 'matrix': [v for row in ob.matrix_world.transposed() for v in row],
                                 'power': ob.data.energy, 'size': ob.data.size, 'color': list(ob.data.color)})
camera = scene.camera
result['camera'] = {'position': list(camera.location), 'target': list(camera.data.dof.focus_object.location),
                    'horizontalFov': math.degrees(2*math.atan(camera.data.sensor_width/(2*camera.data.lens)))}
result['world'] = list(scene.world.node_tree.nodes['Background'].inputs[0].default_value[:3])
result['worldStrength'] = scene.world.node_tree.nodes['Background'].inputs[1].default_value
with gzip.GzipFile(filename=str(out / 'fly.bin.gz'), mode='wb', compresslevel=9, mtime=0) as f: f.write(binary)
(out / 'fly.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
report = {'generator': result['generator'], 'samples': args.samples, 'parts': len(parts),
          'triangles': sum(p['iCount']//3 for p in result['parts']), 'vertices': sum(p['vCount'] for p in result['parts']),
          'seconds': round(time.monotonic()-started, 2), 'bytes': len(binary), 'gzipBytes': (out / 'fly.bin.gz').stat().st_size}
(out / 'bake.json').write_text(json.dumps(report, indent=2) + '\n')
# Sample the scene's actual display transform, rather than approximating its contrast in JavaScript.
n = 48; rgb = np.empty((n, n, n, 4), dtype=np.float32); values = 2.**np.linspace(-12, 8, n)
rgb[:, :, :, 0] = values[None, None, :]; rgb[:, :, :, 1] = values[:, None, None]
rgb[:, :, :, 2] = values[None, :, None]; rgb[:, :, :, 3] = 1
lookup = bpy.data.images.new('AgX Medium High Contrast lookup', width=n*n, height=n, float_buffer=True)
lookup.pixels.foreach_set(rgb.ravel()); lookup.update()
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'
lookup.save_render(str(out / 'agx-look.png'), scene=scene)
print('FLY_REALTIME_BAKE', json.dumps(report), flush=True)
