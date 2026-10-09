import * as THREE from './vendor/three.module.js';

// Shared framing rules for every archive model. Values are expressed relative
// to the model's bounding-sphere radius rather than as scene-specific units.
export const VIEW_DIRECTIONS = {
  perspective: [1, .66, 1.1],
  side: [0, .28, 1],
  front: [1, .28, 0],
  top: [0, 1, .001],
};

const CLOSE_FACTOR = 1.65;
const FAR_FACTOR = 6.4;
const FIT_PADDING = 1.14;

function effectiveFov(camera) {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
  return Math.min(vertical, horizontal);
}

export function createModelFraming({ camera, controls, model }) {
  let frame;

  function refresh() {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    frame = { center: sphere.center, radius: Math.max(sphere.radius, .01) };
    controls.minDistance = frame.radius * CLOSE_FACTOR;
    controls.maxDistance = frame.radius * FAR_FACTOR;
    return frame;
  }

  function pose(view, target = frame.center, padding = FIT_PADDING) {
    const direction = new THREE.Vector3(...VIEW_DIRECTIONS[view]).normalize();
    const distance = frame.radius / Math.sin(effectiveFov(camera) / 2) * padding;
    return { position: target.clone().addScaledVector(direction, distance), target: target.clone() };
  }

  refresh();
  return { refresh, pose, get frame() { return frame; } };
}
