import * as THREE from 'three'
import type { PosterFrame } from '../poster/types'

/** Board behind the presenter, with its visible face toward negative Z. */
export function createPosterBoard() {
  const material = new THREE.MeshBasicMaterial({ color: 0xe4e9df })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  mesh.position.set(0, 2, 3)
  mesh.rotation.y = Math.PI
  mesh.scale.set(3.2, 1.8, 1)

  function setFrame(frame: PosterFrame | null) {
    const previous = material.map
    if (frame) {
      const texture = new THREE.CanvasTexture(frame.canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      material.map = texture
      material.color.set(0xffffff)
      // Fit within 3.2 × 2.4 metres without stretching portrait or wide pages.
      const height = Math.min(2.4, 3.2 / frame.aspectRatio)
      mesh.scale.set(height * frame.aspectRatio, height, 1)
      mesh.userData.page = frame.page
      mesh.userData.pageCount = frame.pageCount
    } else {
      material.map = null
      material.color.set(0xe4e9df)
      mesh.scale.set(3.2, 1.8, 1)
      delete mesh.userData.page
      delete mesh.userData.pageCount
    }
    material.needsUpdate = true
    previous?.dispose()
  }

  return {
    mesh,
    setFrame,
    dispose() {
      material.map?.dispose()
      material.map = null
      material.dispose()
      mesh.geometry.dispose()
    },
  }
}
