// src/lib/threePostprocessing.ts
// This file is pure side-effect free re-exports → Turbopack likes it much more

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
};