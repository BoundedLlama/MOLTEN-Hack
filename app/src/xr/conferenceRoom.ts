import * as THREE from 'three'

export function createConferenceRoom() {
  const room = new THREE.Group()
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0xe5dfd2, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa17b52, roughness: 0.85 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0x667573, roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x2e4545, roughness: 0.8 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff5da }),
    glass: new THREE.MeshBasicMaterial({ color: 0xb9d8df }),
  }
  function box(size: number[], position: number[], material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material)
    mesh.position.set(...position as [number, number, number])
    room.add(mesh)
  }
  box([10, 0.12, 12], [0, -0.08, -2], materials.carpet)
  box([10, 4, 0.15], [0, 2, 3.6], materials.wall)
  box([10, 4, 0.15], [0, 2, -8], materials.wall)
  for (const x of [-5, 5]) {
    box([0.15, 4, 12], [x, 2, -2], materials.wall)
    box([0.18, 0.85, 12], [x, 0.425, -2], materials.wood)
    for (const z of [-5.8, -3, -0.2]) {
      box([0.19, 1.9, 2.2], [x * 0.995, 2.35, z], materials.trim)
      box([0.2, 1.72, 2], [x * 0.99, 2.35, z], materials.glass)
    }
  }
  box([10, 0.12, 12], [0, 4.05, -2], materials.wall)
  for (const z of [-5, -1, 2]) {
    box([3, 0.04, 0.65], [0, 3.97, z], materials.light)
    const light = new THREE.PointLight(0xfff2d9, 18, 10, 2)
    light.position.set(0, 3.6, z)
    room.add(light)
  }
  // Framing behind the PDF supports both portrait and landscape pages.
  box([3.5, 2.7, 0.12], [0, 2, 3.12], materials.trim)
  for (let x = -4.7; x < 4.8; x += 0.3) {
    if (Math.abs(x) > 1.9) box([0.075, 3.6, 0.12], [x, 1.8, 3.46], materials.wood)
  }
  // A lectern beside the presenter's standing position.
  box([0.65, 1.05, 0.48], [-2.8, 0.525, 0.8], materials.wood)
  box([0.8, 0.07, 0.62], [-2.8, 1.08, 0.8], materials.trim)
  room.add(new THREE.HemisphereLight(0xf0f6ff, 0x6b6357, 2.2))
  return {
    group: room,
    dispose() {
      room.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
      Object.values(materials).forEach((material) => material.dispose())
    },
  }
}
