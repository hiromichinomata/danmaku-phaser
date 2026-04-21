import Phaser from 'phaser'
import type { BulletData } from '../types.ts'

export function spawnEnemyBulletArc(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: number
): void {
  const bullet = scene.add.circle(x, y, 5, color)
  scene.physics.add.existing(bullet)
  const body = bullet.body as Phaser.Physics.Arcade.Body
  body.setAllowGravity(false)
  ;(bullet as Phaser.GameObjects.Arc).setData('velocity', { vx, vy } satisfies BulletData)
  group.add(bullet)
}
