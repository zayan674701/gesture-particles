let scene, camera, renderer, particles, geometry, material;
let currentShape = "heart";
let currentPositions = [], targetPositions = [];
let morphProgress = 1, isMorphing = false;
let lastSwitch = 0;

// ---------- INIT ----------
init();
animate();
initHandTracking();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
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
    const count = 2500;
    let positions = [];
    let colors = [];

    if (type === "heart") positions = createHeartShape(count);
    else if (type === "flower") positions = createFlowerShape(count);
    else positions = createFireworksShape(count);

    for (let i = 0; i < positions.length/3; i++) {
        colors.push(Math.random(), Math.random(), Math.random());
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function createHeartShape(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t),3);
        const y = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
        const z = (Math.random() - 0.5) * 6;
        arr.push(x,y,z);
    }
    return arr;
}

function createFlowerShape(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = 10 * Math.sin(5 * t); // petals
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        const z = (Math.random() - 0.5) * 6;
        arr.push(x,y,z);
    }
    return arr;
}

function createFireworksShape(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 40;
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        arr.push(x,y,z);
    }
    return arr;
}

// ---------- MORPH ----------
function morphToShape(newPositions) {
    const posAttr = geometry.attributes.position;
    currentPositions = [...posAttr.array];
    targetPositions = newPositions;
    morphProgress = 0;
    isMorphing = true;
}

// ---------- HAND TRACKING ----------
function initHandTracking() {
    const video = document.getElementById("video");

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onHandResults);

    const cameraFeed = new Camera(video, {
        onFrame: async () => { await hands.send({image: video}); },
        width: 640,
        height: 480
    });
    cameraFeed.start();
}

// Map MediaPipe to Three.js coordinates
function mapTo3D(x, y, z) {
    const mappedX = (x - 0.5) * 50;   // left/right
    const mappedY = -(y - 0.5) * 50;  // top/bottom
    const mappedZ = -z * 20;          // depth
    return { mappedX, mappedY, mappedZ };
}

// ---------- GESTURES ----------
function onHandResults(results) {
    if (!results.multiHandLandmarks.length) return;

    const hand = results.multiHandLandmarks[0];
    const indexTip = hand[8];
    const palm = hand[0];

    const { mappedX, mappedY, mappedZ } = mapTo3D(indexTip.x, indexTip.y, indexTip.z);

    // Scale based on Z
    const scale = THREE.MathUtils.clamp(1 + mappedZ/10, 1, 8);
    particles.scale.set(scale, scale, scale);

    // Rotation based on hand X/Y
    particles.rotation.y = mappedX / 20;
    particles.rotation.x = mappedY / 20;

    // Color based on X
    material.color.setHSL((indexTip.x) % 1, 1, 0.5);

    // Shape switch on finger up
    const now = Date.now();
    if (indexTip.y < palm.y - 0.12 && now - lastSwitch > 1200) {
        lastSwitch = now;

        const count = geometry.attributes.position.count;
        if (currentShape === "heart") {
            currentShape = "flower";
            morphToShape(createFlowerShape(count));
        } else {
            currentShape = "heart";
            morphToShape(createHeartShape(count));
        }
    }
}

// ---------- ANIMATE ----------
function animate() {
    requestAnimationFrame(animate);

    if (isMorphing) {
        morphProgress += 0.02;
        if (morphProgress >= 1) { morphProgress = 1; isMorphing = false; }

        const posAttr = geometry.attributes.position;
        for (let i = 0; i < posAttr.array.length; i++) {
            posAttr.array[i] =
                currentPositions[i] +
                (targetPositions[i] - currentPositions[i]) * morphProgress;
        }
        posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
