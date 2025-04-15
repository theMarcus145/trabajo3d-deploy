import { guiParams, updateMaterialControllers } from './guiController';
import * as THREE from '/node_modules/three/build/three.module.js';

// Declarar variables
let mesh = null;
let vertexNormalsGroup = null;
let colorMap = new Map();
let matcapTexture = null;
let originalMaterials = new Map();
let originalTextures = new Map();

// Inicializar las variables
export function initModelController(modelMesh, normalsGroup, modelColorMap, texture, origMaterials, origTextures) {
    mesh = modelMesh;
    vertexNormalsGroup = normalsGroup;
    colorMap = modelColorMap;
    matcapTexture = texture;
    originalMaterials = origMaterials;
    originalTextures = origTextures;
}

// Función para manejar el wireframe
export function updateWireframe(meshObject) {
    // Eliminar wireframe existente si hay alguno
    meshObject.children = meshObject.children.filter(child => !child.isLineSegments);
    
    // Crear nuevo wireframe si está activado
    if (guiParams.wireframe) {
        const edges = new THREE.EdgesGeometry(meshObject.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 1,
            depthTest: true
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);       
        meshObject.add(wireframe);
    }
}

// Limpiar las normales
export function cleanupVertexNormals() {

    // Eliminar todos los children
    while (vertexNormalsGroup.children.length > 0) {
        const object = vertexNormalsGroup.children[0];
        
        // Eliminar geometría y materiales
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        
        vertexNormalsGroup.remove(object);
    }
}

// Función para actualizar la apariencia del modelo según los ajustes
export function updateModelAppearance() {
    if (!mesh) return;
    
    // First, clear the color map before rebuilding it
    colorMap.clear();
    
    // Clean up any existing vertex normals
    cleanupVertexNormals();
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // If not a wireframe
            if (!child.isLineSegments) {
                
                // Retrieve the original material
                const originalMaterial = originalMaterials.get(child.uuid);
                
                // Decide which material to apply based on GUI options
                if (guiParams.useMatcap && matcapTexture) {
                    // Use MatCap material
                    const matcapMaterial = new THREE.MeshMatcapMaterial({
                        matcap: matcapTexture,
                        transparent: guiParams.modelOpacity > 0,
                        opacity: guiParams.modelOpacity ? 0.6 : 1.0
                    });
                    
                    // Save current color if there is one
                    if (child.material && child.material.color) {
                        matcapMaterial.color = child.material.color.clone();
                    }
                    
                    child.material = matcapMaterial;
                } else {
                    // If switching back from matcap, restore original material
                    // but keep any color changes that were made
                    const previousColor = child.material && child.material.color ? 
                                         child.material.color.clone() : null;
                    
                    // Clone the original material to not modify it
                    child.material = originalMaterial.clone();
                    
                    // If we had a previous color, apply it
                    if (previousColor) {
                        child.material.color = previousColor;
                    }
                    
                    // Apply opacity if enabled in GUI
                    child.material.transparent = guiParams.modelOpacity > 0;
                    child.material.opacity = guiParams.modelOpacity ? 0.6 : 1.0;
                    
                    // Handle texture removal
                    if (guiParams.removeTextures) {
                        // Save original textures if first time
                        if (!originalTextures.has(child.uuid) && child.material.map) {
                            originalTextures.set(child.uuid, child.material.map);
                        }
                        
                        // Remove textures but maintain material color
                        child.material.map = null;
                        
                        // Ensure needsUpdate is true to apply changes
                        child.material.needsUpdate = true;
                    } else {
                        // Restore original texture if it exists
                        if (originalTextures.has(child.uuid)) {
                            child.material.map = originalTextures.get(child.uuid);
                            child.material.needsUpdate = true;
                        }
                    }
                }
                
                // Now, update the colorMap with the current material instance
                if (child.material && child.material.color) {
                    const colorHex = child.material.color.getHexString();
                    
                    // Add this material to the colorMap
                    if (!colorMap.has(colorHex)) {
                        colorMap.set(colorHex, [child.material]);
                    } else {
                        const materials = colorMap.get(colorHex);
                        // Check if this exact material instance is already in the array
                        if (!materials.some(mat => mat === child.material)) {
                            materials.push(child.material);
                        }
                    }
                }
                
                // Draw vertex normals if enabled
                if (guiParams.vertexNormals) { 
                    const geometry = child.geometry; 
                    geometry.computeVertexNormals();
 
                    // Get position and normal attributes
                    const positions = geometry.attributes.position;
                    const normals = geometry.attributes.normal;
 
                    // No limit on normals to load
                    const stride = 1;
 
                    // Create line segments
                    const normalPoints = [];
                    const worldMatrix = child.matrixWorld;
 
                    for (let i = 0; i < positions.count; i += stride) {
                        // Starting point
                        const start = new THREE.Vector3();
 
                        start.fromBufferAttribute(positions, i);
                        start.applyMatrix4(worldMatrix);
 
                        // End point (vertex position + normal direction)
                        const end = new THREE.Vector3();
 
                        end.fromBufferAttribute(normals, i);
                        end.multiplyScalar(0.1); // Normal length
                        end.add(start);
 
                        normalPoints.push(start, end);
                    }
 
                    // Create line segments for each normal
                    const normalGeometry = new THREE.BufferGeometry().setFromPoints(normalPoints);
                    const normalMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const normalLines = new THREE.LineSegments(normalGeometry, normalMaterial);

                    vertexNormalsGroup.add(normalLines); 
                }
                
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Handle wireframes
                updateWireframe(child);
            }
        }
    });   
    
    // Refresh the material controllers with the updated colorMap
    updateMaterialControllers(colorMap);
}