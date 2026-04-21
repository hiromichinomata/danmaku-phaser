import Phaser from 'phaser'
import { spawnPlayerBullet } from './spawnPlayerBullet.ts'

const FIRE_INTERVAL_MS = 75

/**
 * 連射タイミングのみ担当。発射位置は呼び出し側（ステージ）で決める。
 */
export class PlayerAutoShot {
  private shotTimer = 0

  reset(): void {
    this.shotTimer = 0
  }

  /**
   * @returns 今フレームで撃ったか
   */
  tryFire(
    scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    time: number,
    wantShot: boolean,
    leftX: number,
    rightX: number,
    y: number
  ): boolean {
    if (!wantShot) {
      this.shotTimer = 0
      return false
    }
    if (time < this.shotTimer) return false
    this.shotTimer = time + FIRE_INTERVAL_MS
    spawnPlayerBullet(scene, group, leftX, y)
    spawnPlayerBullet(scene, group, rightX, y)
    return true
  }
}
