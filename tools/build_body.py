# Build compact body asset (male base + female morph) from MakeHuman/MPFB2 CC0 base mesh.
import gzip, json, struct, sys, os
import numpy as np
SRC = sys.argv[1]; OUT = sys.argv[2]
D = os.path.join(SRC, 'src/mpfb/data')
verts = []; faces = {}  # group -> list of faces (vertex idx lists)
g = None
for line in open(os.path.join(D, '3dobjs/base.obj')):
    if line.startswith('v '):
        verts.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):
        g = line.split()[1]
    elif line.startswith('f '):
        idx = [int(t.split('/')[0]) - 1 for t in line.split()[1:]]
        faces.setdefault(g, []).append(idx)
V = np.array(verts, dtype=np.float64)
print('verts', len(V), {k: len(v) for k, v in faces.items() if not k.startswith('joint')})

def target(rel):
    d = np.zeros_like(V)
    for ln in gzip.open(os.path.join(D, 'targets', rel)).read().decode().splitlines():
        p = ln.split()
        if len(p) == 4 and p[0].isdigit():
            d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d

def build(sex, muscle, extra):
    v = V.copy()
    for eth in ['african', 'asian', 'caucasian']:
        v += target(f'macrodetails/{eth}-{sex}-young.target.gz') / 3.0
    v += target(f'macrodetails/universal-{sex}-young-maxmuscle-averageweight.target.gz') * muscle
    v += target(f'macrodetails/proportions/{sex}-young-averagemuscle-averageweight-idealproportions.target.gz') * 1.0
    for rel, w in extra:
        v += target(rel) * w
    return v

male = build('male', 0.45, [])
female = build('female', 0.15, [('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz', 0.15)])

keep = ['body', 'helper-l-eye', 'helper-r-eye']
used = sorted({i for k in keep for f in faces[k] for i in f})
remap = {o: n for n, o in enumerate(used)}
def tris(k):
    out = []
    for f in faces[k]:
        f = [remap[i] for i in f]
        for j in range(1, len(f) - 1):
            out += [f[0], f[j], f[j + 1]]
    return out
bodyIdx = tris('body'); eyeIdx = tris('helper-l-eye') + tris('helper-r-eye')

def finalize(v):
    v = v[used] * 0.1  # decimeters -> metres
    bodyv = v[sorted({remap[i] for f in faces['body'] for i in f})]
    v[:, 1] -= bodyv[:, 1].min()
    return v.astype(np.float32)
M = finalize(male); F = finalize(female)
print('male height', M[:, 1].max(), 'female height', F[:, 1].max(), 'n', len(M), 'tris', len(bodyIdx)//3, len(eyeIdx)//3)
print('bbox male', M.min(0), M.max(0))
os.makedirs(OUT, exist_ok=True)
blob = M.tobytes() + (F - M).astype(np.float32).tobytes() + np.array(bodyIdx, np.uint16).tobytes() + np.array(eyeIdx, np.uint16).tobytes()
open(os.path.join(OUT, 'body.bin'), 'wb').write(blob)
json.dump({'vertexCount': len(M), 'bodyIndexCount': len(bodyIdx), 'eyeIndexCount': len(eyeIdx),
           'source': 'MakeHuman / MPFB2 base mesh, CC0 1.0'}, open(os.path.join(OUT, 'body.json'), 'w'))
print('bytes', len(blob))
