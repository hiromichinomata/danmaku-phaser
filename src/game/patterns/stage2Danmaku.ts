import type { Velocity2D } from './bossDanmaku.ts'

export function aimedFanVelocities(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  speed: number,
  fanCount: number,
  fanAngleRad: number
): Velocity2D[] {
  const baseAngle = Math.atan2(targetY - fromY, targetX - fromX)
  if (fanCount <= 1) {
    return [{ vx: Math.cos(baseAngle) * speed, vy: Math.sin(baseAngle) * speed }]
  }
  const half = fanAngleRad / 2
  return Array.from({ length: fanCount }, (_, i) => {
    const t = i / (fanCount - 1)
    const angle = baseAngle - half + fanAngleRad * t
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
  })
}

export function rotatingFlowerVelocities(
  phase: number,
  count: number,
  speed: number
): Velocity2D[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = phase + (Math.PI * 2 * i) / count
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
  })
}
