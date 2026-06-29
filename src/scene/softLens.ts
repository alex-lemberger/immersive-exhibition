import type { SoftLensConfigInput } from '../data/schema'

export interface SoftLensConfig {
  radius: number
  buildTime: number
  decayTime: number
  strength: number
  lineThreshold: number
  floatStrength: number
  intensityWaveStrength: number
}

export interface SoftLensFrameInput {
  previousPressure: number
  previousWake: number
  deltaSeconds: number
  speed: number
  cameraDistance: number
  restingCameraDistance: number
  config: SoftLensConfig
}

export interface SoftLensFrame {
  pressure: number
  wake: number
  lensOpacity: number
  zoomDetail: number
}

export const DEFAULT_SOFT_LENS: SoftLensConfig = {
  radius: 0.16,
  buildTime: 1.0,
  decayTime: 3.0,
  strength: 0.75,
  lineThreshold: 0.55,
  floatStrength: 0.004,
  intensityWaveStrength: 0.22,
}

const STILL_SPEED = 0.015
const MOVING_SPEED = 0.08
const WAKE_BUILD_RATE = 1.125

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function resolveSoftLensConfig(input?: SoftLensConfigInput): SoftLensConfig {
  return {
    radius: input?.activationRadius ?? DEFAULT_SOFT_LENS.radius,
    buildTime: input?.activationBuildTime ?? DEFAULT_SOFT_LENS.buildTime,
    decayTime: input?.activationDecayTime ?? DEFAULT_SOFT_LENS.decayTime,
    strength: input?.activationStrength ?? DEFAULT_SOFT_LENS.strength,
    lineThreshold: input?.lineThreshold ?? DEFAULT_SOFT_LENS.lineThreshold,
    floatStrength: input?.floatStrength ?? DEFAULT_SOFT_LENS.floatStrength,
    intensityWaveStrength:
      input?.intensityWaveStrength ?? DEFAULT_SOFT_LENS.intensityWaveStrength,
  }
}

export function computeSoftLensFrame(input: SoftLensFrameInput): SoftLensFrame {
  const delta = Math.max(0, input.deltaSeconds)
  const speed = Math.max(0, input.speed)
  const buildRate = delta / Math.max(0.001, input.config.buildTime)
  const decayRate = delta / Math.max(0.001, input.config.decayTime)
  const stillness = clamp01(1 - speed / STILL_SPEED)
  const movement = clamp01((speed - STILL_SPEED) / (MOVING_SPEED - STILL_SPEED))

  const pressure = clamp01(
    input.previousPressure + buildRate * stillness - decayRate * movement * 1.35,
  )
  const wake = clamp01(
    input.previousWake +
      movement * WAKE_BUILD_RATE * delta -
      decayRate * (0.8 + stillness * 0.2),
  )

  const distanceRatio =
    input.restingCameraDistance / Math.max(0.001, input.cameraDistance)
  const zoomDetail = clamp01((distanceRatio - 0.75) / 1.25)

  return {
    pressure,
    wake,
    lensOpacity: clamp01((0.75 - pressure) * pressure * 2.4),
    zoomDetail,
  }
}
