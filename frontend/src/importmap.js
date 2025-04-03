// frontend/src/importmap.js
const importMap = document.createElement('script');
importMap.type = 'importmap';
importMap.textContent = JSON.stringify({
  imports: {
    "three": "/node_modules/three/build/three.module.js",
    "three/examples/jsm/controls/OrbitControls.js": "/node_modules/three/examples/jsm/controls/OrbitControls.js",
    "three/examples/jsm/loaders/GLTFLoader.js": "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
  }
});
document.head.appendChild(importMap);