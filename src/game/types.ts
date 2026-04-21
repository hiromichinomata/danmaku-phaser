export type BulletData = {
  vx: number
  vy: number
}

export type RunState = 'playing' | 'gameover' | 'clear'

export type StageStartData = {
  score?: number
  lives?: number
}
