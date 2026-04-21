export type Velocity2D = { vx: number; vy: number }

/** 全方位弾の速度ベクトル（純粋関数・ステージ2でも再利用可） */
export function ringBulletVelocities(count: number, speed: number): Velocity2D[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    }
  })
}

const SPIRAL_SPEED_BONUS = 60

/** 双方向スパイラル用。phase は呼び出し側で累積する */
export function spiralBulletPair(
  phase: number,
  baseSpeed: number
): { pair: [Velocity2D, Velocity2D]; speed: number } {
  const speed = baseSpeed + SPIRAL_SPEED_BONUS
  const a1 = phase
  const a2 = phase + Math.PI
  return {
    speed,
    pair: [
      { vx: Math.cos(a1) * speed, vy: Math.sin(a1) * speed },
      { vx: Math.cos(a2) * speed, vy: Math.sin(a2) * speed },
    ],
  }
}
