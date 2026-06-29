import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SOFT_LENS,
  computeSoftLensFrame,
  resolveSoftLensConfig,
} from './softLens'

describe('resolveSoftLensConfig', () => {
  it('uses defaults and allows artwork overrides', () => {
    const config = resolveSoftLensConfig({
      activationRadius: 0.18,
      activationBuildTime: 0.9,
      activationDecayTime: 3.5,
      activationStrength: 0.7,
      lineThreshold: 0.42,
      floatStrength: 0.006,
      intensityWaveStrength: 0.24,
    })

    expect(config.radius).toBe(0.18)
    expect(config.buildTime).toBe(0.9)
    expect(config.decayTime).toBe(3.5)
    expect(config.strength).toBe(0.7)
    expect(config.lineThreshold).toBe(0.42)
    expect(config.floatStrength).toBe(0.006)
    expect(config.intensityWaveStrength).toBe(0.24)
  })
})

describe('computeSoftLensFrame', () => {
  it('builds pressure while the pointer is still', () => {
    const first = computeSoftLensFrame({
      previousPressure: 0,
      previousWake: 0,
      deltaSeconds: 0.5,
      speed: 0.001,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    const second = computeSoftLensFrame({
      previousPressure: first.pressure,
      previousWake: first.wake,
      deltaSeconds: 0.5,
      speed: 0.001,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(first.pressure).toBeGreaterThan(0)
    expect(second.pressure).toBeGreaterThan(first.pressure)
    expect(second.lensOpacity).toBeGreaterThan(0)
  })

  it('suppresses pressure but leaves a faint wake during movement', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 0.9,
      previousWake: 0,
      deltaSeconds: 0.16,
      speed: 0.4,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(frame.pressure).toBeLessThan(0.9)
    expect(frame.wake).toBeGreaterThan(0)
    expect(frame.lensOpacity).toBeGreaterThanOrEqual(0)
  })

  it('dries pressure and wake over time after movement stops away from the area', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 1,
      previousWake: 0.8,
      deltaSeconds: DEFAULT_SOFT_LENS.decayTime,
      speed: 0.12,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(frame.pressure).toBeLessThan(0.2)
    expect(frame.wake).toBeLessThan(0.2)
  })

  it('increases detail when the camera is closer to the artwork', () => {
    const far = computeSoftLensFrame({
      previousPressure: 0.5,
      previousWake: 0,
      deltaSeconds: 0.1,
      speed: 0.001,
      cameraDistance: 3.2,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })
    const close = computeSoftLensFrame({
      previousPressure: 0.5,
      previousWake: 0,
      deltaSeconds: 0.1,
      speed: 0.001,
      cameraDistance: 1.2,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(close.zoomDetail).toBeGreaterThan(far.zoomDetail)
  })
})
