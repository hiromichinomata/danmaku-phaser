import Phaser from 'phaser'
import type { BulletData } from '../types.ts'
import { HEIGHT, WIDTH } from '../constants.ts'

const MARGIN = 32

export function updatePlayerBulletsMovement(
  group: Phaser.Physics.Arcade.Group,
  deltaMs: number
): void {
  const dt = deltaMs / 1000
  group.getChildren().forEach((obj) => {
    const bullet = obj as Phaser.GameObjects.Rectangle
    const velocity = bullet.getData('velocity') as BulletData | undefined
    if (velocity) {
      bullet.x += velocity.vx * dt
      bullet.y += velocity.vy * dt
      const body = bullet.body as Phaser.Physics.Arcade.Body
      body.updateFromGameObject()
    }
    if (bullet.y < -MARGIN) bullet.destroy()
  })
}

export function updateEnemyBulletsMovement(
  group: Phaser.Physics.Arcade.Group,
  deltaMs: number
): void {
  const dt = deltaMs / 1000
  group.getChildren().forEach((obj) => {
    const bullet = obj as Phaser.GameObjects.Arc
    const velocity = bullet.getData('velocity') as BulletData | undefined
    if (velocity) {
      bullet.x += velocity.vx * dt
      bullet.y += velocity.vy * dt
      const body = bullet.body as Phaser.Physics.Arcade.Body
      body.updateFromGameObject()
    }
    if (
      bullet.x < -MARGIN ||
      bullet.x > WIDTH + MARGIN ||
      bullet.y < -MARGIN ||
      bullet.y > HEIGHT + MARGIN
    ) {
      bullet.destroy()
    }
  })
}

export function updateAllBullets(
  playerBullets: Phaser.Physics.Arcade.Group,
  enemyBullets: Phaser.Physics.Arcade.Group,
  deltaMs: number
): void {
  updatePlayerBulletsMovement(playerBullets, deltaMs)
  updateEnemyBulletsMovement(enemyBullets, deltaMs)
}
