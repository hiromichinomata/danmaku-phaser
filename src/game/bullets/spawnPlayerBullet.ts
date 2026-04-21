import Phaser from 'phaser'
import { BULLET_SPEED } from '../constants.ts'
import type { BulletData } from '../types.ts'

export function spawnPlayerBullet(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  x: number,
  y: number
): void {
  const bullet = scene.add.rectangle(x, y, 4, 14, 0x8ef8ff)
  scene.physics.add.existing(bullet)
  const body = bullet.body as Phaser.Physics.Arcade.Body
  body.setAllowGravity(false)
  bullet.setData('velocity', { vx: 0, vy: -BULLET_SPEED } satisfies BulletData)
  group.add(bullet)
}
