(() => {
  const canvas = document.querySelector('#world-canvas');
  if (!canvas || !window.THREE) return;

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8dd4f1');
  scene.fog = new THREE.Fog('#bce8f1', 27, 58);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 0.2, 0);
  let radius = 25;
  let theta = Math.PI * 0.21;
  let phi = Math.PI * 0.34;
  function placeCamera() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  }
  placeCamera();

  scene.add(new THREE.HemisphereLight('#e6f9ff', '#608456', 2.15));
  const sun = new THREE.DirectionalLight('#fff1ce', 3.2);
  sun.position.set(-8, 18, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  const mat = (color, roughness = 0.86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const rockMat = mat('#80786e');
  const rockLight = mat('#a09583');
  const grassMat = mat('#7bbf62');
  const grassLight = mat('#9bd36a');
  const stoneMats = ['#d4c69c', '#c8b98e', '#e1d1a6'].map(color => mat(color));
  const island = new THREE.Group();
  const obstacleObjects = new Map();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function tagObstacle(group, id, kind, cost, xp) {
    group.userData.obstacle = { id, kind, cost, xp };
    group.traverse(child => { if (child.isMesh) child.userData.obstacleId = id; });
    obstacleObjects.set(id, group);
    return group;
  }
  scene.add(island);

  // Camada rochosa suspensa, com uma ponta irregular voltada para baixo.
  const underside = new THREE.Mesh(new THREE.ConeGeometry(6.5, 5.8, 11, 3), rockMat);
  underside.position.y = -1.85;
  underside.rotation.y = 0.18;
  underside.castShadow = true;
  underside.receiveShadow = true;
  island.add(underside);

  const ledge = new THREE.Mesh(new THREE.CylinderGeometry(8.3, 7.7, 1.35, 16, 2), rockLight);
  ledge.position.y = 0.35;
  ledge.castShadow = true;
  ledge.receiveShadow = true;
  island.add(ledge);

  // Silhueta poligonal da ilha, feita para esta recriação.
  const outline = new THREE.Shape();
  const outlinePoints = [
    [-7.7,-1.2],[-7.2,-3.1],[-5.0,-4.4],[-2.7,-4.8],[0.0,-4.3],[2.8,-4.7],[5.5,-3.9],[7.2,-2.4],
    [7.6,0.0],[7.0,2.5],[5.5,4.0],[3.1,4.5],[0.5,4.15],[-2.2,4.6],[-4.9,3.8],[-6.8,2.4],[-7.8,0.8]
  ];
  outline.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
  outlinePoints.slice(1).forEach(point => outline.lineTo(point[0], point[1]));
  outline.closePath();
  const topGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.72, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.22, bevelThickness: 0.2, curveSegments: 3 });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, [rockMat, grassMat]);
  top.position.y = 0.65;
  top.castShadow = true;
  top.receiveShadow = true;
  island.add(top);

  // Pedras expostas e pequenas raízes de rocha na base da ilha.
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.55, 0), i % 3 ? rockMat : rockLight);
    pebble.position.set(Math.cos(angle) * (6.9 + Math.random() * 0.5), -0.1 - Math.random() * 1.6, Math.sin(angle) * (4.0 + Math.random() * 0.4));
    pebble.scale.set(1.2, 0.8, 0.9);
    pebble.rotation.set(Math.random(), Math.random(), Math.random());
    pebble.castShadow = true;
    tagObstacle(pebble, `island-1-rock-${i}`, 'rock', 25, 14);
    island.add(pebble);
  }

  // Caminho antigo de lajes que atravessa a ilha.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, 1.53, 4.0), new THREE.Vector3(-0.3, 1.54, 2.8),
    new THREE.Vector3(0.2, 1.54, 1.4), new THREE.Vector3(-0.2, 1.54, 0.1),
    new THREE.Vector3(1.0, 1.54, -1.3), new THREE.Vector3(1.5, 1.54, -3.6)
  ]);
  for (let i = 0; i < 42; i++) {
    const point = path.getPoint(i / 41);
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.78 + Math.random() * 0.28, 0.13, 0.62 + Math.random() * 0.2), stoneMats[i % stoneMats.length]);
    stone.position.set(point.x + (Math.random() - 0.5) * 0.26, point.y, point.z + (Math.random() - 0.5) * 0.24);
    stone.rotation.y = (Math.random() - 0.5) * 0.35;
    stone.castShadow = true;
    stone.receiveShadow = true;
    island.add(stone);
  }

  // Lajes laterais e pequenas pedras para a ilha parecer habitada.
  for (const [x, z] of [[-5.3,-1.8],[-5.7,1.3],[5.3,-2.0],[5.8,1.1],[2.4,3.5],[-2.7,-3.5]]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), rockLight);
    stone.position.set(x, 1.45, z);
    stone.scale.set(1.25, 0.22, 0.95);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    island.add(stone);
  }

  const habitats = {
    fire: { label: 'Fogo', color: '#ef734f', point: [-3.65, -1.35] },
    water: { label: 'Água', color: '#48aee3', point: [3.65, -1.35] },
    earth: { label: 'Terra', color: '#77b84f', point: [-3.65, 2.0] },
    air: { label: 'Ar', color: '#a88be0', point: [3.65, 2.0] }
  };
  const crystalMats = {
    fire: mat('#ff8551', 0.34, { emissive: '#752311', emissiveIntensity: 0.38 }),
    water: mat('#55dcf2', 0.3, { emissive: '#155b82', emissiveIntensity: 0.42 }),
    earth: mat('#a4df64', 0.35, { emissive: '#365e20', emissiveIntensity: 0.34 }),
    air: mat('#df9cff', 0.3, { emissive: '#603486', emissiveIntensity: 0.36 })
  };
  const habitatRings = {};
  for (const [element, habitat] of Object.entries(habitats)) {
    const [x, z] = habitat.point;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.2, 9), mat('#9bc36a'));
    pad.position.set(x, 1.54, z);
    pad.castShadow = true;
    pad.receiveShadow = true;
    island.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.49, 0.12, 9, 40), mat(habitat.color, 0.4, { emissive: habitat.color, emissiveIntensity: 0.16 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 1.68, z);
    island.add(ring);
    habitatRings[element] = ring;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.12), mat('#f5e9c6'));
    sign.position.set(x, 1.93, z + 1.5);
    island.add(sign);
    const signText = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.03), mat(habitat.color));
    signText.position.set(x, 1.95, z + 1.42);
    island.add(signText);
    for (let c = 0; c < 3; c++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + c * 0.07, 0), crystalMats[element]);
      crystal.position.set(x + (c - 1) * 0.43, 1.95 + (c % 2) * 0.18, z - 1.25 - (c % 2) * 0.12);
      crystal.scale.y = 1.7;
      crystal.castShadow = true;
      island.add(crystal);
    }
  }

  function makeTree(x, z, scale = 1, id = null) {
    const tree = new THREE.Group();
    tree.position.set(x, 1.35, z);
    tree.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 1.0, 7), mat('#876044'));
    trunk.position.y = 0.48;
    trunk.castShadow = true;
    tree.add(trunk);
    const greens = ['#318c54','#42a75c','#65b856'].map(color => mat(color));
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56 - i * 0.07, 1), greens[i]);
      crown.position.set((i % 2) * 0.14 - 0.06, 1.02 + i * 0.34, 0);
      crown.scale.set(1.0, 0.94, 0.94);
      crown.castShadow = true;
      tree.add(crown);
    }
    if (id) tagObstacle(tree, id, 'tree', 15, 8);
    island.add(tree);
  }
  [[-6.3,-2.8,1.1],[-6.2,0.4,.78],[-5.2,2.8,1],[-2.5,3.7,.72],[0.1,3.5,.83],[5.9,2.7,1.05],[6.4,0.0,.8],[5.8,-3.0,.95],[1.9,-3.5,.72],[-1.9,-3.6,.83]].forEach(([x,z,s],i)=>makeTree(x,z,s,`island-1-tree-${i}`));

  // Maciços de arbustos e folhagem dão à ilha a aparência de jardim habitado.
  // São decoração permanente; árvores e pedras continuam sendo os alvos de limpeza.
  const bushMats = ['#3e9857', '#58ad5e', '#76bd5d', '#91c96b'].map(color => mat(color, 0.9));
  const bushSpots = [
    [-5.5,-2.2],[-4.7,-2.8],[-4.9,-0.9],[-5.4,1.5],[-4.5,2.9],[-3.2,3.4],
    [-1.6,3.8],[-0.5,3.25],[1.1,3.45],[2.2,3.1],[4.2,3.1],[5.2,2.3],
    [5.4,1.1],[6.0,-0.9],[5.0,-2.4],[4.2,-3.0],[2.8,-3.35],[0.8,-3.6],
    [-2.8,-3.1],[-4.3,-2.4],[-3.8,1.8],[3.8,1.7]
  ];
  bushSpots.forEach(([x, z], index) => {
    const bush = new THREE.Group();
    bush.position.set(x, 1.48, z);
    const size = 0.28 + (index % 3) * 0.06;
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (i === 0 ? 1.15 : 0.82), 1), bushMats[(index + i) % bushMats.length]);
      leaf.position.set((i % 2 ? 1 : -1) * size * 0.48, size * (i === 0 ? 0.15 : 0.5), (i < 2 ? -1 : 1) * size * 0.42);
      leaf.scale.set(1.15, 0.86, 1);
      leaf.castShadow = true;
      bush.add(leaf);
    }
    island.add(bush);
  });

  // Pequenos canteiros coloridos reforçam a leitura das áreas de habitat.
  const flowerBeds = [
    [-4.55,-1.65,'#ff8fab'],[-4.15,2.25,'#f6d568'],[-2.3,2.8,'#c895ff'],
    [0.2,2.75,'#ff9f72'],[2.55,2.8,'#f7dc70'],[4.45,1.5,'#f69ac7'],
    [4.45,-1.8,'#c394f3'],[2.75,-2.75,'#ff9b77'],[-1.25,-2.95,'#e6a3ff'],[-3.65,0.95,'#ffe184']
  ];
  flowerBeds.forEach(([x, z, color], index) => {
    const bed = new THREE.Group();
    bed.position.set(x, 1.51, z);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.22, 5), mat('#438b4b'));
      stem.position.set(Math.cos(angle) * 0.22, 0.11, Math.sin(angle) * 0.16);
      bed.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), mat(color, 0.5, { emissive: color, emissiveIntensity: 0.09 }));
      bloom.position.set(Math.cos(angle) * 0.22, 0.24, Math.sin(angle) * 0.16);
      bed.add(bloom);
    }
    const centerBloom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(index % 2 ? '#f7d977' : '#fff0c8'));
    centerBloom.position.y = 0.25;
    bed.add(centerBloom);
    island.add(bed);
  });
  // Flores luminosas e arbustos ao redor dos caminhos.
  for (let i = 0; i < 36; i++) {
    const angle = Math.random() * Math.PI * 2;
    const d = 2.0 + Math.random() * 4.5;
    const x = Math.cos(angle) * d;
    const z = Math.sin(angle) * d * 0.64;
    const flower = new THREE.Group();
    flower.position.set(x, 1.52, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.28, 5), mat('#4b8e4e'));
    stem.position.y = 0.14;
    flower.add(stem);
    const bloomColors = ['#f4d773','#fb89b3','#d6a4ff','#fff3d2'];
    const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat(bloomColors[i % bloomColors.length], 0.52, { emissive: bloomColors[i % bloomColors.length], emissiveIntensity: 0.08 }));
    bloom.position.y = 0.31;
    flower.add(bloom);
    island.add(flower);
  }

  // Nuvens baixas para reforçar a sensação de ilha suspensa.
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const x = (i % 3 - 1) * 12 + (Math.random() - 0.5) * 4;
    const z = (Math.floor(i / 3) - 1) * 8;
    cloud.position.set(x, -2.2 + Math.random() * 1.8, z);
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat('#f2fcff', 1, { transparent: true, opacity: 0.78 }));
      puff.position.set((j - 1.5) * 0.8, Math.random() * 0.25, Math.sin(j) * 0.25);
      puff.scale.set(1.3, 0.58, 0.78);
      cloud.add(puff);
    }
    scene.add(cloud);
    clouds.push(cloud);
  }

  const dragonPalettes = {
    fire: { body: '#ed714f', belly: '#f6c66f', wing: '#bd4562', horn: '#f1d98b' },
    water: { body: '#4eabe0', belly: '#a9e5f1', wing: '#3678bb', horn: '#d1f2f5' },
    earth: { body: '#6eae55', belly: '#d5d587', wing: '#477c51', horn: '#e5d892' },
    air: { body: '#a48bd9', belly: '#e5d3fa', wing: '#7765bb', horn: '#f0e0b8' }
  };
  let currentDragon = null;
  function createDragon(element = 'fire') {
    const palette = dragonPalettes[element] || dragonPalettes.fire;
    const dragon = new THREE.Group();
    const bodyMat = mat(palette.body, 0.58);
    const bellyMat = mat(palette.belly, 0.72);
    const wingMat = mat(palette.wing, 0.58, { side: THREE.DoubleSide });
    const hornMat = mat(palette.horn, 0.52);
    const darkMat = mat('#3a3947', 0.42);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 24, 18), bodyMat);
    body.scale.set(1.2, 0.82, 0.82);
    body.position.y = 0.73;
    body.castShadow = true;
    dragon.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.57, 20, 16), bellyMat);
    belly.scale.set(0.92, 0.72, 0.82);
    belly.position.set(0.13, 0.6, 0.08);
    dragon.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 0.75, 16), bodyMat);
    neck.position.set(0.7, 1.0, 0);
    neck.rotation.z = -0.47;
    dragon.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 16), bodyMat);
    head.scale.set(1.12, 0.94, 0.92);
    head.position.set(1.13, 1.35, 0);
    head.castShadow = true;
    dragon.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), bellyMat);
    muzzle.scale.set(1.18, 0.72, 0.8);
    muzzle.position.set(1.48, 1.18, 0);
    dragon.add(muzzle);
    for (const side of [-1,1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), darkMat);
      eye.position.set(1.29, 1.42, side * 0.31);
      dragon.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 8), hornMat);
      horn.position.set(0.97, 1.78, side * 0.24);
      horn.rotation.z = -0.26;
      horn.castShadow = true;
      dragon.add(horn);
    }
    const wings = [];
    for (const side of [-1,1]) {
      const pivot = new THREE.Group();
      pivot.position.set(-0.15, 1.08, side * 0.42);
      const shape = new THREE.Shape();
      shape.moveTo(0,0); shape.lineTo(-0.35,0.85); shape.lineTo(-1.3,1.5); shape.lineTo(-1.13,0.6); shape.lineTo(-1.75,0.87); shape.lineTo(-0.88,-0.1); shape.closePath();
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMat);
      wing.rotation.y = side * Math.PI / 2;
      wing.castShadow = true;
      pivot.add(wing);
      dragon.add(pivot);
      wings.push({ pivot, side });
    }
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72,0.73,0), new THREE.Vector3(-1.28,0.56,0), new THREE.Vector3(-1.68,0.29,0), new THREE.Vector3(-2.0,0.43,0)
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 18, 0.13, 8, false), bodyMat);
    dragon.add(tail);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.18,0.48,8), hornMat);
    tailTip.position.set(-2.08,0.48,0);
    tailTip.rotation.z = Math.PI / 2;
    dragon.add(tailTip);
    for (const x of [-0.35,0.58]) {
      for (const side of [-1,1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,0.42,9), bodyMat);
        leg.position.set(x,0.25,side*0.43);
        leg.rotation.z = -0.13;
        dragon.add(leg);
      }
    }
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.28,7), hornMat);
      spike.position.set(-0.55 + i*0.34,1.43 - i*0.07,0);
      spike.rotation.z = -0.4;
      dragon.add(spike);
    }
    dragon.userData.wings = wings;
    dragon.userData.body = body;
    return dragon;
  }
  function showDragon(data) {
    if (currentDragon) island.remove(currentDragon);
    const element = data?.element || 'fire';
    const habitat = habitats[element] || habitats.fire;
    currentDragon = createDragon(element);
    currentDragon.name = 'active-dragon';
    currentDragon.position.set(habitat.point[0], 1.76, habitat.point[1]);
    currentDragon.scale.setScalar(0.95);
    island.add(currentDragon);
    for (const [key, ring] of Object.entries(habitatRings)) {
      ring.material.emissiveIntensity = key === element ? 0.55 : 0.14;
    }
  }
  window.addEventListener('dragon:change', event => showDragon(event.detail));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('dragon-isles-save') || '{}'); } catch {}
  const firstDragon = Array.isArray(saved.dragons) ? saved.dragons.find(d => d.id === saved.selectedDragon) || saved.dragons[0] : null;
  showDragon(firstDragon || { element: 'fire' });

  window.addEventListener('world:island-purchased', event => {
    const number = event.detail.number;
    const hadDragon = currentDragon && currentDragon.parent === island;
    if (hadDragon) island.remove(currentDragon);
    const expanded = island.clone(true);
    if (hadDragon) island.add(currentDragon);
    expanded.position.set(number % 2 ? 7 : -7, -3.6, -7);
    expanded.scale.setScalar(0.48);
    expanded.name = `island-${number}`;

    expanded.traverse(node => {
      if (!node.userData.obstacle) return;
      const old = node.userData.obstacle;
      const id = old.id.replace('island-1-', `island-${number}-`);
      node.userData.obstacle = { ...old, id };
      node.traverse(child => { if (child.isMesh) child.userData.obstacleId = id; });
      obstacleObjects.set(id, node);
    });
    scene.add(expanded);
    try {
      const saved = JSON.parse(localStorage.getItem('dragon-isles-save') || '{}');
      for (const id of saved.cleared || []) { const object=obstacleObjects.get(id); if(object){object.parent?.remove(object);obstacleObjects.delete(id);} }
    } catch {}
    target.set(expanded.position.x, expanded.position.y + .2, expanded.position.z);
    radius = 20;
    placeCamera();
  });
  window.addEventListener('world:remove-obstacle', event => {
    const object = obstacleObjects.get(event.detail.id);
    if (object) { object.parent?.remove(object); obstacleObjects.delete(event.detail.id); }
  });
  try {
    for (let n = 2; n <= Number(saved.islands || 1); n++) window.dispatchEvent(new CustomEvent('world:island-purchased', { detail: { number: n } }));
  } catch {}
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  canvas.addEventListener('pointerdown', event => {
    dragging = true; lastX = event.clientX; lastY = event.clientY; pointerStartX = event.clientX; pointerStartY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    theta -= (event.clientX - lastX) * 0.008;
    phi = THREE.MathUtils.clamp(phi + (event.clientY - lastY) * 0.005, 0.22, 0.78);
    lastX = event.clientX; lastY = event.clientY;
    placeCamera();
  });
  canvas.addEventListener('pointerup', event => {
    dragging = false;
    if (Math.hypot(event.clientX-pointerStartX,event.clientY-pointerStartY)>7 || !document.querySelector('.island').classList.contains('cleanup-active')) return;
    const rect=canvas.getBoundingClientRect();
    pointer.x=((event.clientX-rect.left)/rect.width)*2-1; pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(scene.children,true);
    for(const hit of hits){
      let object=hit.object;
      while(object && !object.userData.obstacleId) object=object.parent;
      const obstacle=object && obstacleObjects.get(object.userData.obstacleId)?.userData.obstacle;
      if(obstacle){window.dispatchEvent(new CustomEvent('world:clear-obstacle',{detail:obstacle}));break;}
    }
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.012, 16, 34);
    placeCamera();
  }, { passive: false });

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement.clientWidth;
    const height = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();
  try {
    const saved = JSON.parse(localStorage.getItem('dragon-isles-save') || '{}');
    for (const id of saved.cleared || []) { const object = obstacleObjects.get(id); if (object) { object.parent?.remove(object); obstacleObjects.delete(id); } }
  } catch {}

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    island.position.y = Math.sin(time * 0.55) * 0.09;
    island.rotation.y = Math.sin(time * 0.12) * 0.035;
    clouds.forEach((cloud, index) => { cloud.position.x += Math.sin(time * 0.09 + index) * 0.002; });
    if (currentDragon) {
      currentDragon.position.y = 1.76 + Math.sin(time * 2.0) * 0.09;
      currentDragon.rotation.y = Math.sin(time * 0.7) * 0.12;
      currentDragon.userData.wings.forEach(({ pivot, side }) => {
        pivot.rotation.x = Math.sin(time * 5.3 + side) * 0.42;
      });
    }
    renderer.render(scene, camera);
  }
  animate();
})();
