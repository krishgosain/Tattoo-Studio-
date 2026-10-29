import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
    this.camera.position.set(0, 1.0, 4.6);

    const controls = new OrbitControls(this.camera, canvas);
    controls.target.set(0, 0.92, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.45;
    controls.maxDistance = 6.5;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.2;
    this.controls = controls;

    // studio lighting: warm key, cool + warm rims, soft fill — tuned to read skin and ink
    const key = new THREE.DirectionalLight('#fff1e2', 2.2);
    key.position.set(1.6, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1; key.shadow.camera.right = 1;
    key.shadow.camera.top = 2.2; key.shadow.camera.bottom = -0.2;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.key = key;
    const keyBack = new THREE.DirectionalLight('#ffe9d6', 1.4);
    keyBack.position.set(-1.4, 3.0, -2.6);
    const rimL = new THREE.DirectionalLight('#9fd3c4', 1.2);
    rimL.position.set(-3, 1.8, -1.2);
    const rimR = new THREE.DirectionalLight('#ffb98a', 1.0);
    rimR.position.set(3, 1.4, -1.5);
    const fill = new THREE.HemisphereLight('#f3e6d6', '#0f2a22', 0.65);
    scene.add(key, keyBack, rimL, rimR, fill);

    // contact shadow floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.ShadowMaterial({ opacity: 0.32 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 64),
      new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.001;
    scene.add(glow);

    this.flights = null;
    this.onFrame = [];
    this.clock = new THREE.Clock();
    this._resize = () => this.resize();
    new ResizeObserver(this._resize).observe(canvas.parentElement);
    this.resize();
    this.running = true;
    this.visible = true;
    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.visible) return;
      const dt = this.clock.getDelta();
      this.tick(dt);
    };
    loop();
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  tick(dt) {
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = ease(f.t);
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
      // arc through a slightly wider radius so moves feel like a dolly, not a zoom
      if (f.arc) {
        const off = Math.sin(k * Math.PI) * f.arc;
        const dir = this.camera.position.clone().sub(this.controls.target).setY(0).normalize();
        this.camera.position.addScaledVector(dir, off);
      }
      this.controls.target.lerpVectors(f.fromT, f.toT, k);
      if (f.t >= 1) { this.flight = null; f.resolve?.(); }
    }
    this.controls.update();
    this.onFrame.forEach((fn) => fn(dt));
    this.renderer.render(this.scene, this.camera);
  }

  // fly the camera; `azimuth` measured around Y with 0 = front
  flyTo({ target, distance, azimuth = 0, elevation = 0.05, dur = 1.2, arc = 0.25 }) {
    const t = new THREE.Vector3().copy(target);
    const pos = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance
    ).add(t);
    return new Promise((resolve) => {
      this.flight = {
        t: 0, dur,
        fromPos: this.camera.position.clone(), toPos: pos,
        fromT: this.controls.target.clone(), toT: t,
        arc: arc * distance, resolve,
      };
    });
  }

  snapshot(scale = 2) {
    const r = this.renderer;
    const old = r.getPixelRatio();
    r.setPixelRatio(scale);
    this.resize();
    r.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    r.setPixelRatio(old);
    this.resize();
    return url;
  }
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(232,214,180,0.16)');
  grd.addColorStop(1, 'rgba(232,214,180,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
