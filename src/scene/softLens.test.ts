import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SOFT_LENS,
  computeSoftLensFrame,
  resolveSoftLensConfig,
} from './softLens'

describe('resolveSoftLensConfig', () => {
  it('uses defaults for missing values when overrides are partial', () => {
    const config = resolveSoftLensConfig({
      activationRadius: 0.2,
      intensityWaveStrength: 0.18,
    })

    expect(config.radius).toBe(0.2)
    expect(config.buildTime).toBe(DEFAULT_SOFT_LENS.buildTime)
    expect(config.decayTime).toBe(DEFAULT_SOFT_LENS.decayTime)
    expect(config.strength).toBe(DEFAULT_SOFT_LENS.strength)
    expect(config.lineThreshold).toBe(DEFAULT_SOFT_LENS.lineThreshold)
    expect(config.floatStrength).toBe(DEFAULT_SOFT_LENS.floatStrength)
    expect(config.intensityWaveStrength).toBe(0.18)
  })

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
  it('clamps negative delta and speed safely', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 0.35,
      previousWake: 0.45,
      deltaSeconds: -0.5,
      speed: -0.2,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(frame.pressure).toBe(0.35)
    expect(frame.wake).toBe(0.45)
    expect(frame.lensOpacity).toBeGreaterThanOrEqual(0)
    expect(frame.lensOpacity).toBeLessThanOrEqual(1)
  })

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
    expect(first.lensOpacity).toBeGreaterThan(0)
    expect(second.pressure).toBeGreaterThan(first.pressure)
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

  it('builds equivalent wake for equivalent elapsed movement time', () => {
    const input = {
      previousPressure: 0,
      previousWake: 0,
      speed: 0.4,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    }
    const oneStep = computeSoftLensFrame({
      ...input,
      deltaSeconds: 0.16,
    })

    const fourSteps = Array.from({ length: 4 }).reduce<number>(
      (wake) =>
        computeSoftLensFrame({
          ...input,
          previousWake: wake,
          deltaSeconds: 0.04,
        }).wake,
      0,
    )

    expect(fourSteps).toBeCloseTo(oneStep.wake, 5)
  })

  it('dries wake over time after movement stops', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 0,
      previousWake: 0.8,
      deltaSeconds: DEFAULT_SOFT_LENS.decayTime,
      speed: 0,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

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

  it('keeps lens opacity transitional through pressure build', () => {
    const frameAtPressure = (previousPressure: number) =>
      computeSoftLensFrame({
        previousPressure,
        previousWake: 0,
        deltaSeconds: 0,
        speed: 0,
        cameraDistance: 2.4,
        restingCameraDistance: 2.4,
        config: DEFAULT_SOFT_LENS,
      })

    const empty = frameAtPressure(0)
    const partial = frameAtPressure(0.4)
    const mature = frameAtPressure(0.9)

    expect(empty.lensOpacity).toBe(0)
    expect(partial.lensOpacity).toBeGreaterThan(0)
    expect(mature.lensOpacity).toBeCloseTo(0, 5)
  })
})
