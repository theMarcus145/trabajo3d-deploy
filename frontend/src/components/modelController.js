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

// Funcion para limpiar las normales
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
    
    // Si reiniciamos al original, se hace lo primero

    if (resetToOriginal) {
        resetMaterialsToOriginal(mesh, originalMaterials, originalTextures);
    }

    
    // Limpiar el colormap
    colorMap.clear();
    
    // Limpiar las normales
    cleanupVertexNormals();
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // Si no es un wireframe:
            if (!child.isLineSegments) {
                
                // Almacenar el material original
                const originalMaterial = originalMaterials.get(child.uuid);
                
                // Decidir qué material utilizar
                if (guiParams.useMatcap) { // Si useMatcap está activado (true)
                    // Activar matcap
                    const matcapMaterial = new THREE.MeshMatcapMaterial({
                        matcap: matcapTexture,
                        transparent: guiParams.modelOpacity > 0,
                        opacity: guiParams.modelOpacity ? 0.6 : 1.0
                    });
                    
                    // Almacenar el color
                    if (child.material && child.material.color) {
                        matcapMaterial.color = child.material.color.clone();
                    }
                    
                    child.material = matcapMaterial;
                    
                } else if (guiParams.useNormalMap){
                    
                    const normalMaterial = new THREE.MeshNormalMaterial({
                        transparent: guiParams.modelOpacity > 0,
                        opacity: guiParams.modelOpacity ? 0.6 : 1.0
                    });

                    child.material = normalMaterial;

                } else {
                    // Si se desactiva el matcap, cargar la textura original pero manteniendo los cambios de color
                    const previousColor = child.material && child.material.color ? child.material.color.clone() : null;
                                         
                    // Clonar el material original para no modificarlo
                    child.material = originalMaterial.clone();

                    if (previousColor) {
                        child.material.color = previousColor;
                    }
                    
                    // Aplicar opacidad si esta está activada
                    child.material.transparent = guiParams.modelOpacity > 0;
                    child.material.opacity = guiParams.modelOpacity ? 0.6 : 1.0;
                    
                    // Manejar la eliminación de texturas si está activa en la GUI
                    if (guiParams.removeTextures) {
                        if (!originalTextures.has(child.uuid) && child.material.map) {
                            originalTextures.set(child.uuid, child.material.map);
                        }
                        
                        // Quitar las texturas pero mantener el color del material
                        child.material.map = null;

                        child.material.needsUpdate = true;
                    } else {
                        // Si se desactiva la función, simplemente se carga de nuevo la textura anteriormente guardada
                        if (originalTextures.has(child.uuid)) {
                            child.material.map = originalTextures.get(child.uuid);
                            child.material.needsUpdate = true;
                        }
                    }
                }
                
                // Actualizar el colormap
                if (child.material && child.material.color) {
                    const colorHex = child.material.color.getHexString();
                    
                    // Añadir el material al colormap
                    if (!colorMap.has(colorHex)) {
                        colorMap.set(colorHex, [child.material]);
                    } else {
                        const materials = colorMap.get(colorHex);
                        // Comprobar si este material exacto ya está en el colormap
                        if (!materials.some(mat => mat === child.material)) {
                            materials.push(child.material);
                        }
                    }
                }
                
                // Dibujar normales si estas están activadas
                if (guiParams.vertexNormals) { 
                    const geometry = child.geometry; 
                    geometry.computeVertexNormals();
 
                    // Obtener tanto los atributos como la posición
                    const positions = geometry.attributes.position;
                    const normals = geometry.attributes.normal;
 
                    const stride = 1;
 
                    // Crear segmentos de línea
                    const normalPoints = [];
                    const worldMatrix = child.matrixWorld;
 
                    for (let i = 0; i < positions.count; i += stride) {
                        // Punto de comienzo
                        const start = new THREE.Vector3();
 
                        start.fromBufferAttribute(positions, i);
                        start.applyMatrix4(worldMatrix);
 
                        // Punto de fin (vertex position + normal direction)
                        const end = new THREE.Vector3();
 
                        end.fromBufferAttribute(normals, i);
                        end.multiplyScalar(0.1); // La longitud de la normal
                        end.add(start);
 
                        normalPoints.push(start, end);
                    }
 
                    // Crear segmentos de línea por cada normal
                    const normalGeometry = new THREE.BufferGeometry().setFromPoints(normalPoints);
                    const normalMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const normalLines = new THREE.LineSegments(normalGeometry, normalMaterial);

                    vertexNormalsGroup.add(normalLines); 
                }
                
                
                // manejar los wireframes
                updateWireframe(child);
            }
        }
    });   

    // Refrescar los controladores del color de los materiales con el nuevo colormap
    updateMaterialControllers(colorMap);
}

export function resetMaterialsToOriginal(mesh, originalMaterials, originalTextures) {
    if (!mesh) return;
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // Obtener el material original del mesh
            const originalMaterial = originalMaterials.get(child.uuid);
            
            if (originalMaterial) {
                // Clonar el material
                child.material = originalMaterial.clone();
                
                // Restorear la textura original
                if (originalTextures.has(child.uuid)) {
                    child.material.map = originalTextures.get(child.uuid);
                    child.material.needsUpdate = true;
                }
            }
        }
    });
}