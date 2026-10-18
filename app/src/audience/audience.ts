import * as THREE from 'three'

const people: THREE.Group[] = []
let audience: THREE.Group | null = null
let speaking = false
let mouth: THREE.Mesh | null = null

export function setAudienceSpeaking(value: boolean): void {
  speaking = value
  if (!value && mouth) mouth.scale.y = 0.008
}

/** Seated audience faces +Z toward the presenter. Dimensions are in meters. */
export function createAudience(count: number): THREE.Group {
  disposeAudience()
  audience = new THREE.Group()
  const skin = [0xb97e59, 0xe3b394, 0x724a35, 0xd09a72]
  const clothing = [0x315569, 0x896e64, 0x66765a, 0x9f7950, 0x55556d, 0x526c70]
  const sphere = new THREE.SphereGeometry(1, 12, 10)
  const box = new THREE.BoxGeometry(1, 1, 1)
  for (let i = 0; i < count; i++) {
    const person = new THREE.Group()
    person.position.set(((i % 4) - 1.5) * 1.35, 0, -2.5 - Math.floor(i / 4) * 1.45)
    const materials = {
      skin: new THREE.MeshStandardMaterial({ color: skin[i % skin.length], roughness: 0.9 }),
      shirt: new THREE.MeshStandardMaterial({ color: clothing[i % clothing.length], roughness: 1 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x29323a, roughness: 1 }),
      hair: new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0x594438 : 0x292624 }),
      chair: new THREE.MeshStandardMaterial({ color: 0x36534d, roughness: 0.8 }),
    }
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, size: number[], position: number[], parent = person) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.scale.set(size[0], size[1], size[2])
      mesh.position.set(position[0], position[1], position[2])
      parent.add(mesh)
      return mesh
    }
    part(box, materials.chair, [0.62, 0.12, 0.6], [0, 0.5, 0])
    part(box, materials.chair, [0.62, 0.65, 0.09], [0, 0.85, -0.26])
    for (const x of [-0.24, 0.24]) {
      for (const z of [-0.22, 0.22]) part(box, materials.dark, [0.035, 0.48, 0.035], [x, 0.24, z])
      part(sphere, materials.dark, [0.12, 0.12, 0.32], [x * 0.65, 0.63, 0.16])
      part(box, materials.dark, [0.15, 0.45, 0.16], [x * 0.65, 0.3, 0.4])
      part(sphere, materials.dark, [0.11, 0.07, 0.2], [x * 0.65, 0.07, 0.47])
    }
    const upper = new THREE.Group()
    upper.position.y = 0.65
    part(sphere, materials.shirt, [0.27, 0.36, 0.18], [0, 0.3, 0], upper)
    part(sphere, materials.skin, [0.075, 0.1, 0.075], [0, 0.65, 0], upper)
    part(sphere, materials.skin, [0.16, 0.205, 0.16], [0, 0.86, 0], upper)
    part(sphere, materials.hair, [0.167, 0.115, 0.162], [0, 0.99, -0.015], upper)
    part(sphere, materials.skin, [0.04, 0.045, 0.05], [0, 0.86, 0.15], upper)
    // Front row, closest to the presenter. +Z is the front of the face.
    if (i === 0) {
      mouth = part(sphere, materials.dark, [0.06, 0.008, 0.018], [0, 0.79, 0.153], upper)
      mouth.name = 'Audience speaker mouth'
    }
    for (const x of [-1, 1]) {
      part(sphere, materials.dark, [0.016, 0.018, 0.012], [x * 0.06, 0.9, 0.147], upper)
      const arm = part(sphere, materials.shirt, [0.09, 0.27, 0.09], [x * 0.28, 0.23, 0.05], upper)
      arm.rotation.x = -0.25
      part(sphere, materials.skin, [0.07, 0.06, 0.13], [x * 0.25, 0.02, 0.23], upper)
    }
    person.add(upper)
    people.push(upper)
    audience.add(person)
  }
  return audience
}

export function updateAudience(elapsedSeconds: number, animateIdle = true): void {
  if (mouth) mouth.scale.y = speaking ? 0.008 + 0.035 * (0.5 + 0.5 * Math.sin(elapsedSeconds * 18)) : 0.008
  if (!animateIdle) return
  people.forEach((person, i) => {
    person.rotation.z = Math.sin(elapsedSeconds * 0.65 + i * 1.7) * 0.012
    person.rotation.y = Math.sin(elapsedSeconds * 0.35 + i) * 0.035
  })
}

export function disposeAudience(): void {
  setAudienceSpeaking(false)
  mouth = null
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  audience?.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry)
      const list = Array.isArray(object.material) ? object.material : [object.material]
      list.forEach((material) => materials.add(material))
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  people.length = 0
  audience = null
}
