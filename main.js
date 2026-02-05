let scene, camera, renderer, particles, geometry, material;
let currentShape = "heart";

// ---------- INIT ----------
init();
animate();
initHandTracking();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 50;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  geometry = new THREE.BufferGeometry();
  generateShape(currentShape);

  material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  window.addEventListener("resize", onResize);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- SHAPES ----------
function generateShape(type) {
  const positions = [];
  const colors = [];

  for (let i = 0; i < 2500; i++) {
    let x = 0, y = 0, z = 0;

    if (type === "heart") {
      let t = Math.random() * Math.PI * 2;
      x = 16 * Math.pow(Math.sin(t), 3);
      y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      z = (Math.random() - 0.5) * 10;
    }

    if (type === "saturn") {
      let angle = Math.random() * Math.PI * 2;
      let radius = 18 + Math.random() * 4;
      x = Math.cos(angle) * radius;
      y = (Math.random() - 0.5) * 2;
      z = Math.sin(angle) * radius;
    }

    if (type === "fireworks") {
      x = (Math.random() - 0.5) * 40;
      y = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
    }

    positions.push(x, y, z);
    colors.push(Math.random(), Math.random(), Math.random());
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );
}

// ---------- HAND TRACKING ----------
function initHandTracking() {
  const video = document.getElementById("video");

  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(onHandResults);

  const cam = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  cam.start();
}

// ---------- GESTURES ----------
let lastSwitch = 0;

function onHandResults(results) {
  if (!results.multiHandLandmarks.length) return;

  const hand = results.multiHandLandmarks[0];
  const indexTip = hand[8];
  const palm = hand[0];

  // Particle scale (hand distance)
  const scale = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(indexTip.z, -0.3, 0.3, 2, 8),
    1,
    8
  );
  particles.scale.set(scale, scale, scale);

  // Color control
  material.color.setHSL(indexTip.x, 1, 0.5);

  // Shape switch (index finger up)
  const now = Date.now();
  if (indexTip.y < palm.y - 0.12 && now - lastSwitch > 1200) {
    lastSwitch = now;
    const shapes = ["heart", "saturn", "fireworks"];
    currentShape = shapes[Math.floor(Math.random() * shapes.length)];
    generateShape(currentShape);
  }
}

// ---------- LOOP ----------
function animate() {
  requestAnimationFrame(animate);
  particles.rotation.y += 0.002;
  particles.rotation.x += 0.001;
  renderer.render(scene, camera);
}
