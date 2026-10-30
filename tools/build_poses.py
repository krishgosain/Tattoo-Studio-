# Pose the CC0 MakeHuman/MPFB2 body with its game-engine rig (linear blend skinning)
# to stage the studio film: a client seated with the left forearm out on an armrest,
# and an artist on a stool leaning in, right hand on the pen, left hand stretching skin.
# Output: public/models/studio.bin (+ .json) in world coordinates (metres, y up).
import gzip, json, os, sys
import numpy as np
from scipy.spatial.transform import Rotation as Rot
from scipy.optimize import minimize

SRC, OUT = sys.argv[1], sys.argv[2]
D = os.path.join(SRC, 'src/mpfb/data')

# ---------------------------------------------------------------- base mesh + shape
verts, faces, g = [], {}, None
for line in open(os.path.join(D, '3dobjs/base.obj')):
    if line.startswith('v '):
        verts.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):
        g = line.split()[1]
    elif line.startswith('f '):
        faces.setdefault(g, []).append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
V0 = np.array(verts)

def target(rel):
    d = np.zeros_like(V0)
    for ln in gzip.open(os.path.join(D, 'targets', rel)).read().decode().splitlines():
        p = ln.split()
        if len(p) == 4 and p[0].isdigit():
            d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d

def shape(sex, muscle, extra=()):
    v = V0.copy()
    for eth in ['african', 'asian', 'caucasian']:
        v += target(f'macrodetails/{eth}-{sex}-young.target.gz') / 3
    v += target(f'macrodetails/universal-{sex}-young-maxmuscle-averageweight.target.gz') * muscle
    v += target(f'macrodetails/proportions/{sex}-young-averagemuscle-averageweight-idealproportions.target.gz')
    for rel, w in extra:
        v += target(rel) * w
    return v * 0.1  # metres

keep = ['body', 'helper-l-eye', 'helper-r-eye']
used = sorted({i for k in keep for f in faces[k] for i in f})
remap = {o: n for n, o in enumerate(used)}

# ---------------------------------------------------------------- rig
rig = json.load(open(os.path.join(D, 'rigs/standard/rig.game_engine.json')))
W = json.load(open(os.path.join(D, 'rigs/standard/weights.game_engine.json')))['weights']
order = []
def visit(n):
    if n in order: return
    p = rig[n]['parent']
    if p: visit(p)
    order.append(n)
for n in rig: visit(n)

def joint(v, spec):
    if spec.get('strategy') == 'CUBE':
        idx = sorted({i for f in faces[spec['cube_name']] for i in f})
    else:
        idx = spec['vertex_indices']
    return v[idx].mean(0)

wmat = {}
for b, lst in W.items():
    if lst:
        wmat[b] = (np.array([i for i, _ in lst]), np.array([x for _, x in lst]))
wsum = np.zeros(len(V0))
for b, (ii, ww) in wmat.items():
    np.add.at(wsum, ii, ww)
wsum[wsum == 0] = 1

def bones_of(v):
    return {n: (joint(v, rig[n]['head']), joint(v, rig[n]['tail'])) for n in rig}

def M(rot=None, about=None, trans=None):
    m = np.eye(4)
    if rot is not None:
        R = rot.as_matrix()
        m[:3, :3] = R
        if about is not None:
            m[:3, 3] = about - R @ about
    if trans is not None:
        m[:3, 3] += trans
    return m

def axis_of(bones, n):
    h, t = bones[n]
    a = t - h
    return a / np.linalg.norm(a)

def pose_globals(bones, pose):
    """pose: bone -> scipy Rotation expressed in rest world space, applied about the bone head."""
    G = {}
    for n in order:
        p = rig[n]['parent']
        local = M(pose[n], about=bones[n][0]) if n in pose else np.eye(4)
        G[n] = (G[p] if p else np.eye(4)) @ local
    return G

def skin(v, G):
    out = np.zeros_like(v)
    vh = np.c_[v, np.ones(len(v))]
    for b, (ii, ww) in wmat.items():
        out[ii] += (vh[ii] @ G[b].T)[:, :3] * ww[:, None]
    return out / wsum[:, None]

def bone_point(G, bones, n, which=0):
    p = bones[n][which]
    return (G[n] @ np.r_[p, 1])[:3]

E = lambda *a: Rot.from_euler('xyz', a, degrees=True)
def twist(bones, n, deg):
    return Rot.from_rotvec(axis_of(bones, n) * np.radians(deg))
def curl(bones, n, deg, lateral):
    ax = np.cross(axis_of(bones, n), lateral)
    ax /= np.linalg.norm(ax)
    return Rot.from_rotvec(ax * np.radians(deg))

def fingers(bones, pose, side, base, mid, tip, thumb=(0, 0, 0)):
    lat = bones[f'pinky_01_{side}'][0] - bones[f'index_01_{side}'][0]
    lat /= np.linalg.norm(lat)
    for f in ['index', 'middle', 'ring', 'pinky']:
        for k, ang in zip(['01', '02', '03'], [base, mid, tip]):
            pose[f'{f}_{k}_{side}'] = curl(bones, f'{f}_{k}_{side}', ang, lat)
    for k, ang in zip(['01', '02', '03'], thumb):
        pose[f'thumb_{k}_{side}'] = curl(bones, f'thumb_{k}_{side}', ang, lat)

def world(rot_y_deg, pos):
    m = np.eye(4)
    m[:3, :3] = Rot.from_euler('y', rot_y_deg, degrees=True).as_matrix()
    m[:3, 3] = pos
    return m
def apply(m, p):
    return (m @ np.r_[p, 1])[:3]

def solve(bones, pose, side, Wm, palm_w, elbow_w=None, hand_dir_w=None, label=''):
    Wi = np.linalg.inv(Wm)
    palm_t = apply(Wi, palm_w)
    elbow_t = apply(Wi, elbow_w) if elbow_w is not None else None
    hd_t = (Wi[:3, :3] @ hand_dir_w) if hand_dir_w is not None else None
    names = [f'upperarm_{side}', f'lowerarm_{side}', f'hand_{side}']
    base = {k: pose[k] for k in names if k in pose}
    def build(x):
        p = dict(pose)
        for i, nm in enumerate(names):
            r = Rot.from_rotvec(x[i * 3:i * 3 + 3])
            p[nm] = r * base[nm] if nm in base else r
        return p
    def palm_of(G):
        return (bone_point(G, bones, f'middle_01_{side}', 0) + bone_point(G, bones, f'hand_{side}', 0)) / 2
    def cost(x):
        G = pose_globals(bones, build(x))
        c = np.sum((palm_of(G) - palm_t) ** 2) * 400
        if elbow_t is not None:
            c += np.sum((bone_point(G, bones, f'lowerarm_{side}', 0) - elbow_t) ** 2) * 200
        if hd_t is not None:
            d = bone_point(G, bones, f'middle_01_{side}', 0) - bone_point(G, bones, f'hand_{side}', 0)
            c += (1 - d @ hd_t / np.linalg.norm(d)) * 0.5
        return c + 0.002 * np.sum(x ** 2)
    best = minimize(cost, np.zeros(9), method='Powell', options={'maxiter': 8000, 'xtol': 1e-4, 'ftol': 1e-8})
    p = build(best.x)
    G = pose_globals(bones, p)
    print(label, side, 'palm err cm', round(float(np.linalg.norm(palm_of(G) - palm_t)) * 100, 2),
          'elbow err cm', round(float(np.linalg.norm(bone_point(G, bones, f'lowerarm_{side}', 0) - elbow_t)) * 100, 2) if elbow_t is not None else '-')
    return p

# ---------------------------------------------------------------- client: seated, left forearm out, palm up
client_v = shape('male', 0.45)
cb = bones_of(client_v)
seat = {
    'thigh_l': E(-84, 0, 3), 'thigh_r': E(-84, 0, -3),
    'calf_l': E(80, 0, 0), 'calf_r': E(80, 0, 0),
    'foot_l': E(4, 0, 0), 'foot_r': E(4, 0, 0),
}
client_pose = dict(seat)
client_pose.update({
    'spine_01': E(-12, 0, 0), 'spine_02': E(-4, 0, 0),
    'neck_01': E(4, 16, 0), 'head': E(6, 12, 0),
    'lowerarm_l': twist(cb, 'lowerarm_l', -75),
})
fingers(cb, client_pose, 'l', 10, 12, 8, (4, 6, 4))
fingers(cb, client_pose, 'r', 28, 36, 22, (10, 14, 10))
def seat_bottom(v, G, bones):
    """lowest point of the buttocks: verts around and behind the pelvis, above the knees"""
    pel = bone_point(G, bones, 'pelvis', 0)
    knee = min(bone_point(G, bones, 'calf_l', 0)[1], bone_point(G, bones, 'calf_r', 0)[1])
    vv = v[used]
    m = (np.abs(vv[:, 0] - pel[0]) < 0.18) & (vv[:, 2] < pel[2] + 0.06) & (vv[:, 1] > knee - 0.12)
    return vv[m][:, 1].min()

# seat the client on a 0.47 m chair
G0 = pose_globals(cb, client_pose)
tmp = skin(client_v, G0)
CW = world(0, np.array([0, 0.47 - seat_bottom(tmp, G0, cb), 0]))
sh_l = apply(CW, bone_point(G0, cb, 'upperarm_l', 0))
print('client shoulder L', sh_l.round(3))
# left arm out to the side and a little forward, forearm resting on an arm stand
elbow_t = sh_l + np.array([0.17, -0.22, 0.07])
palm_t = elbow_t + np.array([0.12, -0.03, 0.27])
client_pose = solve(cb, client_pose, 'l', CW, palm_w=palm_t, elbow_w=elbow_t, hand_dir_w=np.array([0.35, -0.08, 1.0]), label='client')
knee_r = apply(CW, bone_point(G0, cb, 'calf_r', 0))
hip_r = apply(CW, bone_point(G0, cb, 'thigh_r', 0))
client_pose = solve(cb, client_pose, 'r', CW, palm_w=hip_r * 0.45 + knee_r * 0.55 + np.array([0.0, 0.08, 0.0]), hand_dir_w=np.array([0.0, -0.4, 1.0]), label='client')
Gc = pose_globals(cb, client_pose)
client_world = (np.c_[skin(client_v, Gc), np.ones(len(client_v))] @ CW.T)[:, :3]

# tattoo spot: upward-facing middle of the left forearm
elbow = apply(CW, bone_point(Gc, cb, 'lowerarm_l', 0))
wrist = apply(CW, bone_point(Gc, cb, 'hand_l', 0))
mid = elbow * 0.45 + wrist * 0.55
cand = client_world[used]
near = np.linalg.norm(cand - mid, axis=1) < 0.05
spot = cand[near][np.argmax(cand[near][:, 1])]
fore_dir = (wrist - elbow) / np.linalg.norm(wrist - elbow)
arm_under = cand[near][:, 1].min()
print('client forearm', elbow.round(3), wrist.round(3), 'spot', spot.round(3), 'underside', round(float(arm_under), 3))

# ---------------------------------------------------------------- artist: on a stool, leaning in over the arm
artist_v = shape('female', 0.2, [('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz', 0.1)])
ab = bones_of(artist_v)
base_pose = {
    'thigh_l': E(-82, 0, 6), 'thigh_r': E(-82, 0, -6),
    'calf_l': E(84, 0, 0), 'calf_r': E(76, 0, 0),
    'spine_01': E(16, 0, 0), 'spine_02': E(10, 0, 0), 'spine_03': E(6, 0, 0),
    'neck_01': E(16, 0, 0), 'head': E(20, 0, 0),
}
fingers(ab, base_pose, 'r', 38, 42, 26, (20, 22, 12))
fingers(ab, base_pose, 'l', 14, 16, 10, (8, 10, 6))
A_rot = -90  # faces -x, toward the client's arm
pen_axis = np.array([0.45, 0.8, 0.4]); pen_axis /= np.linalg.norm(pen_axis)
grip = spot + pen_axis * 0.075
lhand_t = spot + fore_dir * 0.09 + np.array([0.015, 0.03, 0.0])
Ga0 = pose_globals(ab, base_pose)
loc_sh = (bone_point(Ga0, ab, 'upperarm_l', 0) + bone_point(Ga0, ab, 'upperarm_r', 0)) / 2
R = Rot.from_euler('y', A_rot, degrees=True).as_matrix()
want_sh = spot + np.array([0.36, 0.34, 0.0])
AW = np.eye(4); AW[:3, :3] = R; AW[:3, 3] = want_sh - R @ loc_sh
tmpa = skin(artist_v, Ga0)
stool_top = float((np.c_[tmpa, np.ones(len(tmpa))] @ AW.T)[:, 1][used].min()) if False else None
pose = solve(ab, base_pose, 'r', AW, palm_w=grip, hand_dir_w=-pen_axis + np.array([0, -0.2, 0]), label='artist')
pose = solve(ab, pose, 'l', AW, palm_w=lhand_t, hand_dir_w=np.array([-0.85, -0.45, 0.2]), label='artist')
Ga = pose_globals(ab, pose)
artist_world = (np.c_[skin(artist_v, Ga), np.ones(len(artist_v))] @ AW.T)[:, :3]
seat_y = float(apply(AW, np.r_[0, seat_bottom(skin(artist_v, Ga), Ga, ab), 0])[1])
print('artist seat height', round(seat_y, 3))

# ---------------------------------------------------------------- export
def head_frame(G, bones, W_):
    h = apply(W_, bone_point(G, bones, 'head', 0))
    t = apply(W_, bone_point(G, bones, 'head', 1))
    R = (W_[:3, :3] @ G['head'][:3, :3])
    return {'head': h.round(5).tolist(), 'top': t.round(5).tolist(), 'rot': R.round(5).tolist()}

os.makedirs(OUT, exist_ok=True)
blob = client_world[used].astype(np.float32).tobytes() + artist_world[used].astype(np.float32).tobytes()
open(os.path.join(OUT, 'studio.bin'), 'wb').write(blob)
meta = {
    'vertexCount': len(used),
    'spot': spot.round(5).tolist(),
    'forearm': {'elbow': elbow.round(5).tolist(), 'wrist': wrist.round(5).tolist()},
    'penAxis': pen_axis.round(5).tolist(),
    'armUnder': round(float(arm_under), 4),
    'artistSeat': round(seat_y, 4),
    'artistPos': AW[:3, 3].round(4).tolist(),
    'client': head_frame(Gc, cb, CW),
    'artist': head_frame(Ga, ab, AW),
    'source': 'MakeHuman / MPFB2 base mesh, game_engine rig and weights (CC0 1.0)',
}
json.dump(meta, open(os.path.join(OUT, 'studio.json'), 'w'))
print('wrote', len(blob), 'bytes', meta['spot'])
