"""Build an editable Cycles macro scene from the browser's full scan and setae.

node scripts/export_fly_blender.mjs /tmp/fly-blender/appearance.json
blender -b --factory-startup --python scripts/render_fly_blender.py -- --samples 128
"""
import argparse
import json
import math
from pathlib import Path
import sys
import time

import bpy
import numpy as np
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--appearance', default='/tmp/fly-blender/appearance.json')
parser.add_argument('--output', default=str(ROOT / 'art/fly/front.png'))
parser.add_argument('--blend', default=str(ROOT / 'art/fly/fly-macro.blend'))
parser.add_argument('--view', choices=['front', 'three-quarter', 'full'], default='front')
parser.add_argument('--samples', type=int, default=128)
parser.add_argument('--width', type=int, default=1400)
parser.add_argument('--height', type=int, default=1000)
parser.add_argument('--front-elevation', type=float, default=-10, help='Degrees above the front of the head')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
started = time.monotonic()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def node(tree, kind, name=None):
    n = tree.nodes.new(kind)
    if name:
        n.label = name
    return n


def material(name, color, rough=.45, sss=0., scale=.001):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['IOR'].default_value = 1.46
    p.inputs['Subsurface Weight'].default_value = sss
    p.inputs['Subsurface Radius'].default_value = (1., .48, .22)
    p.inputs['Subsurface Scale'].default_value = scale
    p.inputs['Coat Weight'].default_value = 0
    return m, p


def ramp(tree, source, lo, hi, name):
    n = node(tree, 'ShaderNodeValToRGB', name)
    n.color_ramp.elements[0].position = .18
    n.color_ramp.elements[0].color = (*lo, 1)
    n.color_ramp.elements[1].position = .82
    n.color_ramp.elements[1].color = (*hi, 1)
    tree.links.new(source, n.inputs[0])
    return n.outputs['Color']


def cuticle(name, color, rough=.42, sss=.24, scale=.0014):
    m, p = material(name, color, rough, sss, scale)
    t = m.node_tree
    co = node(t, 'ShaderNodeTexCoord')
    grain = node(t, 'ShaderNodeTexNoise', 'Fine cuticle grain')
    grain.inputs['Scale'].default_value = 4200
    grain.inputs['Detail'].default_value = 2
    t.links.new(co.outputs['Object'], grain.inputs['Vector'])
    cells = node(t, 'ShaderNodeTexVoronoi', 'Microsculpture cell walls')
    cells.feature = 'DISTANCE_TO_EDGE'
    cells.inputs['Scale'].default_value = 2900
    t.links.new(co.outputs['Object'], cells.inputs['Vector'])
    bump = node(t, 'ShaderNodeBump', 'Cell relief')
    bump.inputs['Strength'].default_value = .5
    bump.inputs['Distance'].default_value = .0002
    t.links.new(cells.outputs['Distance'], bump.inputs['Height'])
    fine = node(t, 'ShaderNodeBump', 'Fine surface grain')
    fine.inputs['Strength'].default_value = .35
    fine.inputs['Distance'].default_value = .00008
    t.links.new(grain.outputs['Fac'], fine.inputs['Height'])
    t.links.new(bump.outputs['Normal'], fine.inputs['Normal'])
    t.links.new(fine.outputs['Normal'], p.inputs['Normal'])
    t.links.new(ramp(t, grain.outputs['Fac'], (rough-.14,)*3, (rough+.17,)*3, 'Uneven gloss'), p.inputs['Roughness'])
    mott = node(t, 'ShaderNodeTexNoise', 'Amber pigment variation')
    mott.inputs['Scale'].default_value = 125
    mott.inputs['Detail'].default_value = 3
    t.links.new(co.outputs['Object'], mott.inputs['Vector'])
    t.links.new(ramp(t, mott.outputs['Fac'], tuple(v*.55 for v in color), tuple(v*1.3 for v in color), 'Pigment'), p.inputs['Base Color'])
    packed_path = ROOT / 'public/body/cuticle_detail.png'
    if packed_path.exists():
        packed = node(t, 'ShaderNodeTexImage', 'Blender-baked detail · shared with WebGL')
        packed.image = bpy.data.images.load(str(packed_path), check_existing=True)
        packed.image.colorspace_settings.name = 'Non-Color'
        packed.projection = 'BOX'; packed.projection_blend = .25
        mapping = node(t, 'ShaderNodeVectorMath'); mapping.operation = 'SCALE'
        mapping.inputs['Scale'].default_value = 48
        t.links.new(co.outputs['Object'], mapping.inputs[0]); t.links.new(mapping.outputs[0], packed.inputs['Vector'])
        channels = node(t, 'ShaderNodeSeparateColor'); channels.mode = 'RGB'
        t.links.new(packed.outputs['Color'], channels.inputs[0])
        relief = node(t, 'ShaderNodeBump', 'Packed cellular surface relief')
        relief.inputs['Distance'].default_value = .00022; relief.inputs['Strength'].default_value = .8
        t.links.new(channels.outputs['Red'], relief.inputs['Height']); t.links.new(relief.outputs['Normal'], p.inputs['Normal'])
        roughmap = node(t, 'ShaderNodeMapRange')
        for k, v in [('From Min', .22), ('From Max', .7), ('To Min', rough-.16), ('To Max', rough+.16)]:
            roughmap.inputs[k].default_value = v
        t.links.new(channels.outputs['Green'], roughmap.inputs['Value']); t.links.new(roughmap.outputs[0], p.inputs['Roughness'])
        t.links.new(ramp(t, channels.outputs['Blue'], tuple(v*.55 for v in color), tuple(v*1.3 for v in color), 'Baked pigment'), p.inputs['Base Color'])
    return m


mats = {
    'body': cuticle('Amber chitin · microrelief + shallow scattering', (.49, .225, .057)),
    'thorax': cuticle('Notum · warm satin cuticle', (.35, .15, .037), .46, .19),
    'leg': cuticle('Leg · thin golden cuticle', (.58, .31, .096), .36, .3, .0018),
    'pale': cuticle('Soft mouthparts · pale translucent cuticle', (.65, .43, .18), .4, .38, .0025),
    'antenna': cuticle('Antennae · dense golden microsculpture', (.22, .094, .021), .43, .18),
}
mats['bristle'], p = material('Bristles · dark amber shafts', (.021, .008, .002), .28)
p.inputs['Anisotropic'].default_value = .45
mats['hair'], p = material('Fine setae · light-catching amber', (.135, .067, .021), .36, .1, .00005)
p.inputs['Sheen Weight'].default_value = .15
mats['pale_hair'], p = material('Mouthpart microtrichia · pale gold', (.45, .29, .11), .36, .12, .00005)
mats['eye'], p = material('Ommatidia · red pigment beneath individual lenses', (.49, .016, .006), .22, .09, .0002)
p.inputs['Coat Weight'].default_value = .28
p.inputs['Coat Roughness'].default_value = .12
t = mats['eye'].node_tree
co = node(t, 'ShaderNodeTexCoord')
noise = node(t, 'ShaderNodeTexNoise', 'Lens-to-lens pigment variation')
noise.inputs['Scale'].default_value = 1200
noise.inputs['Detail'].default_value = 1
t.links.new(co.outputs['Object'], noise.inputs['Vector'])
t.links.new(ramp(t, noise.outputs['Fac'], (.23, .006, .002), (.58, .033, .012), 'Red screening pigment'), p.inputs['Base Color'])
mats['ocelli'], p = material('Ocelli · polished amber lenses', (.045, .014, .003), .13, .1, .0001)
p.inputs['Coat Weight'].default_value = .45
mats['wing'], p = material('Wing · transparent thin film', (.92, .96, .9), .18)
p.inputs['Transmission Weight'].default_value = .96
p.inputs['IOR'].default_value = 1.38
if 'Thin Wall' in p.inputs:
    p.inputs['Thin Wall'].default_value = True
if 'Thin Film Thickness' in p.inputs:
    p.inputs['Thin Film Thickness'].default_value = 330
    p.inputs['Thin Film IOR'].default_value = 1.52
mats['vein'], p = material('Wing veins · translucent amber', (.27, .14, .042), .34, .24, .0005)
p.inputs['Transmission Weight'].default_value = .2


def matrix(a):
    return Matrix(np.array(a).reshape(4, 4).T.tolist())


def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices.tolist(), [], faces.tolist())
    mesh.update()
    mesh.polygons.foreach_set('use_smooth', np.ones(len(mesh.polygons), dtype=bool))
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def arrange_nodes(tree):
    """Keep the shipped material graphs readable and remove disconnected fallback branches."""
    output = next((n for n in tree.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if output is None: return
    depths = {output: 0}; pending = [output]
    while pending:
        current = pending.pop(0)
        for socket in current.inputs:
            for link in socket.links:
                depth = depths[current] + 1
                if depths.get(link.from_node, -1) < depth:
                    depths[link.from_node] = depth; pending.append(link.from_node)
    rows = {}
    for n in list(tree.nodes):
        if n not in depths:
            tree.nodes.remove(n); continue
        d = depths[n]; row = rows.get(d, 0); rows[d] = row + 1
        n.location = (-d*260, -row*340); n.width = 210


source = json.loads((ROOT / 'public/body/fly_hd.json').read_text())
binary = (ROOT / 'public/body/fly_hd.bin').read_bytes()
extras = json.loads(Path(args.appearance).read_text())
poses = {p['name']: matrix(p['matrix']) for p in extras['parts']}
objects = {}
for part in source['parts']:
    name = part['geom']
    vertices = np.frombuffer(binary, dtype='<f4', count=part['vCount']*3, offset=part['vOff']).reshape(-1, 3)
    faces = np.frombuffer(binary, dtype='<u4', count=part['iCount'], offset=part['iOff']).reshape(-1, 3)
    kind = 'body'
    if name == 'head_red': kind = 'eye'
    elif name == 'head_ocelli': kind = 'ocelli'
    elif 'black' in name or 'bristle' in name or 'claw' in name: kind = 'bristle'
    elif 'membrane' in name: kind = 'wing'
    elif name.startswith('wing_'): kind = 'vein'
    elif 'lower' in name or name.startswith(('rostrum', 'haustellum', 'labrum')): kind = 'pale'
    elif name.startswith('antenna'): kind = 'antenna'
    elif name.startswith(('coxa', 'femur', 'tibia', 'tarsus', 'haltere')): kind = 'leg'
    elif name == 'thorax': kind = 'thorax'
    mat = mats[kind]
    if name.startswith('abdomen') and 'lower' not in name:
        mat = mat.copy(); mat.name = name + ' · posterior pigment'
        t = mat.node_tree; p = t.nodes.get('Principled BSDF')
        original = p.inputs['Base Color'].links[0].from_socket
        co = node(t, 'ShaderNodeTexCoord'); xyz = node(t, 'ShaderNodeSeparateXYZ')
        t.links.new(co.outputs['Generated'], xyz.inputs[0])
        band = node(t, 'ShaderNodeMapRange'); band.clamp = True
        band.inputs['From Min'].default_value = .65
        band.inputs['From Max'].default_value = .72
        if name in ('abdomen_6', 'abdomen_7', 'abdomen_8'):
            band.inputs['From Min'].default_value = -1
            band.inputs['From Max'].default_value = 0
        t.links.new(xyz.outputs['Y'], band.inputs['Value'])
        mix = node(t, 'ShaderNodeMixRGB'); mix.inputs[2].default_value = (.017, .006, .002, 1)
        t.links.new(original, mix.inputs[1]); t.links.new(band.outputs[0], mix.inputs[0]); t.links.new(mix.outputs[0], p.inputs['Base Color'])
    ob = mesh_object(name, vertices, faces, mat)
    ob.matrix_world = poses[name]
    if kind in ('eye', 'body', 'thorax', 'pale', 'antenna', 'leg'):
        sub = ob.modifiers.new('Macro silhouette smoothing', 'SUBSURF')
        sub.levels = sub.render_levels = 1
    objects[name] = ob

# Realize each hair batch with NumPy. No per-hair Python object or thousands of dependency-graph nodes.
template = np.array(extras['hairTemplate']['positions'], dtype=np.float32).reshape(-1, 3)
indices = np.array(extras['hairTemplate']['indices'], dtype=np.int32).reshape(-1, 3)
for batch in extras['hairs']:
    count = batch['count']
    if not count: continue
    transforms = np.array(batch['instances'], dtype=np.float32).reshape(count, 4, 4).transpose(0, 2, 1)
    vertices = np.einsum('nij,vj->nvi', transforms[:, :3, :3], template) + transforms[:, None, :3, 3]
    faces = indices[None, :, :] + np.arange(count)[:, None, None] * len(template)
    kind = 'pale_hair' if any(k in batch['name'] for k in ['labrum', 'antenna', 'haltere']) else 'hair'
    if 'sexcomb' in batch['name']: kind = 'bristle'
    ob = mesh_object(batch['name'], vertices.reshape(-1, 3), faces.reshape(-1, 3), mats[kind])
    ob.matrix_world = matrix(batch['matrix'])

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices: d.use = d.type == 'METAL'
    scene.cycles.device = 'GPU'
except (TypeError, RuntimeError):
    scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = .012
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 8
scene.cycles.transparent_max_bounces = 8
scene.render.resolution_x = args.width
scene.render.resolution_y = args.height
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = -.2
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.55, .68, .58, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .12


def point_at(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat('-Z', 'Y').to_euler()


head = objects['head']
center = head.matrix_world.translation.copy()
target = center + Vector((.012, 0, -.002))
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = {'front': 'Macro camera · frontal reference', 'three-quarter': 'Macro camera · three-quarter', 'full': 'Macro camera · full body'}[args.view]
camera.data.lens = 100
camera.data.sensor_width = 36
camera.data.clip_start = .0005
camera.data.clip_end = 100
if args.view == 'front':
    elevation = math.radians(args.front_elevation)
    camera.location = target + Vector((.39*math.cos(elevation), -.008, .39*math.sin(elevation)))
elif args.view == 'three-quarter':
    target = Vector((.025, 0, -.002))
    camera.location = target + Vector((.34, -.28, .12))
else:
    # Fit every body part and hair batch; a fixed head framing can clip the wings or claws.
    model = [ob for ob in scene.objects if ob.type == 'MESH']
    bounds = [ob.matrix_world @ Vector(corner) for ob in model for corner in ob.bound_box]
    target = Vector(tuple((min(p[i] for p in bounds)+max(p[i] for p in bounds))/2 for i in range(3)))
    camera.location = target + Vector((.8, -.68, .4))
point_at(camera, target)
scene.camera = camera
if args.view == 'full':
    direction = (camera.location-target).normalized()
    for _ in range(3):
        low, high = .15, 3.
        for _ in range(20):
            distance = (low+high)/2
            camera.location = target + direction*distance
            bpy.context.view_layer.update()
            projected = [world_to_camera_view(scene, camera, point) for point in bounds]
            if all(.075 < p.x < .925 and .09 < p.y < .91 and p.z > 0 for p in projected): high = distance
            else: low = distance
        camera.location = target + direction*high
        # Centre the projected silhouette, which can differ from the world-space bounding-box centre.
        dx = (min(p.x for p in projected)+max(p.x for p in projected))/2-.5
        dy = (min(p.y for p in projected)+max(p.y for p in projected))/2-.5
        span = high*camera.data.sensor_width/camera.data.lens
        shift = camera.rotation_euler.to_quaternion() @ Vector((dx*span, dy*span*args.height/args.width, 0))
        target += shift; camera.location += shift
bpy.ops.object.empty_add(location=target)
focus = bpy.context.object
focus.name = 'Focus · head capsule'
camera.data.dof.use_dof = True
camera.data.dof.focus_object = focus
camera.data.dof.aperture_fstop = 48 if args.view in ('front', 'full') else 24
camera.data.dof.aperture_blades = 9


def area(name, pos, power, size, color, target=target):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power; data.shape = 'DISK'; data.size = size; data.color = color
    ob = bpy.data.objects.new(name, data); scene.collection.objects.link(ob)
    ob.location = pos; point_at(ob, target)


area('Key · broad macro diffuser', (.24, -.19, .24), 1.4, .17, (1., .9, .75))
area('Fill · eye-facet catchlights', (.26, .20, .09), .6, .12, (.83, .94, 1.))
area('Rim · amber transmission', (-.08, .03, .14), 1.2, .12, (1., .7, .4))
area('Bounce · pale mouthpart detail', (.28, -.02, -.16), .38, .2, (1., .85, .62))

# Additional inspection cameras stay in the .blend so the complete scan is easy to review.
for name, focus_pos, offset in [
    ('Three-quarter camera', (.025, 0, -.002), (.34, -.28, .12)),
    ('Full-body camera', (-.025, 0, -.015), (.8, -.68, .4)),
]:
    data = camera.data.copy(); data.dof.aperture_fstop = 24
    ob = bpy.data.objects.new(name, data); scene.collection.objects.link(ob)
    ob.location = Vector(focus_pos) + Vector(offset); point_at(ob, focus_pos)
    focus_ob = bpy.data.objects.new(name + ' focus', None); scene.collection.objects.link(focus_ob)
    focus_ob.location = focus_pos; data.dof.focus_object = focus_ob

# A defocused physical backdrop, with the reference's yellow-to-mint colour falloff.
bpy.ops.mesh.primitive_plane_add(size=2, location=(-.28, 0, 0), rotation=(0, math.pi/2, 0))
bg = bpy.context.object; bg.name = 'Defocused mint and ochre backdrop'
mat, p = material('Backdrop · yellow mint gradient', (.4, .5, .3), .9)
t = mat.node_tree; co = node(t, 'ShaderNodeTexCoord'); sep = node(t, 'ShaderNodeSeparateXYZ')
t.links.new(co.outputs['Generated'], sep.inputs[0])
color = ramp(t, sep.outputs['Y'], (.40, .32, .12), (.15, .49, .37), 'Warm to mint')
t.links.new(color, p.inputs['Base Color'])
t.links.new(color, p.inputs['Emission Color'])
p.inputs['Emission Strength'].default_value = .45
bg.data.materials.append(mat)

if args.view == 'full':
    bg.hide_render = True
    floor_z = min((ob.matrix_world @ Vector(c)).z for name, ob in objects.items() if 'claw' in name for c in ob.bound_box)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, floor_z-.0001))
    floor = bpy.context.object; floor.name = 'Matte macro stage · claw contact'
    mat, p = material('Stage · warm sage with fine grain', (.19, .24, .14), .83)
    t = mat.node_tree; noise = node(t, 'ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 1800
    bump = node(t, 'ShaderNodeBump'); bump.inputs['Distance'].default_value = .00004; bump.inputs['Strength'].default_value = .15
    t.links.new(noise.outputs['Fac'], bump.inputs['Height']); t.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    co = node(t, 'ShaderNodeTexCoord'); xyz = node(t, 'ShaderNodeSeparateXYZ'); t.links.new(co.outputs['Object'], xyz.inputs[0])
    axis = node(t, 'ShaderNodeMath'); axis.operation = 'ADD'; t.links.new(xyz.outputs['X'], axis.inputs[0]); t.links.new(xyz.outputs['Y'], axis.inputs[1])
    gradient = node(t, 'ShaderNodeMapRange'); gradient.inputs['From Min'].default_value = -.6; gradient.inputs['From Max'].default_value = .6
    t.links.new(axis.outputs[0], gradient.inputs[0])
    color = ramp(t, gradient.outputs[0], (.36, .29, .12), (.14, .31, .21), 'Seamless ochre-to-sage stage')
    t.links.new(color, p.inputs['Base Color']); t.links.new(color, p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = .22
    floor.data.materials.append(mat)

scene.render.filepath = str(Path(args.output).resolve())
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
Path(args.blend).parent.mkdir(parents=True, exist_ok=True)
scene['provenance'] = 'flybody full scan; browser procedural hairs; Blender node materials guided by user photo. Added microtexture and scattering are artistic approximations.'
for mat in bpy.data.materials:
    if mat.node_tree: arrange_nodes(mat.node_tree)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D': area.spaces.active.region_3d.view_perspective = 'CAMERA'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.blend).resolve()), compress=True)
bpy.ops.render.render(write_still=True)
report = {'blender': bpy.app.version_string, 'engine': scene.render.engine, 'device': scene.cycles.device,
          'samples': args.samples, 'resolution': [args.width, args.height], 'view': args.view,
          'seconds_including_scene_setup': round(time.monotonic()-started, 2), 'render': str(Path(args.output).resolve()),
          'blend': str(Path(args.blend).resolve())}
Path(args.output).with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
print('FLY_RENDER_RESULT', json.dumps(report))
