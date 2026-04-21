import type { Velocity2D } from './bossDanmaku.ts'
import { ringBulletVelocities } from './bossDanmaku.ts'

/** 8 方向（上下左右＋斜め）の一斉放射 */
export function octDirectionBurst(speed: number): Velocity2D[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
  })
}

/** 外周と内周の二重全方位（大ボスらしい壁の圧） */
export function doubleRingVelocities(
  outerCount: number,
  innerCount: number,
  outerSpeed: number,
  innerSpeed: number
): { outer: Velocity2D[]; inner: Velocity2D[] } {
  return {
    outer: ringBulletVelocities(outerCount, outerSpeed),
    inner: ringBulletVelocities(innerCount, innerSpeed),
  }
}

/** 回転する多弾「腕」— 毎 tick 少しずつ角度が進む */
export function rotatingSpokeVelocities(
  phase: number,
  spokeCount: number,
  speed: number
): Velocity2D[] {
  return Array.from({ length: spokeCount }, (_, i) => {
    const a = phase + (Math.PI * 2 * i) / spokeCount
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
  })
}

/** プレイヤー狙いの狭い扇（弾幕の「締め」用） */
export function tightAimedFan(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  speed: number,
  count: number,
  fanAngleRad: number
): Velocity2D[] {
  const base = Math.atan2(targetY - fromY, targetX - fromX)
  if (count <= 1) {
    return [{ vx: Math.cos(base) * speed, vy: Math.sin(base) * speed }]
  }
  const half = fanAngleRad / 2
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    const a = base - half + fanAngleRad * t
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
  })
}
