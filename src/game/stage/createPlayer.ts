import Phaser from 'phaser'
import { HEIGHT, WIDTH } from '../constants.ts'

export type PlayerEntity = {
  player: Phaser.GameObjects.Arc
  hitbox: Phaser.GameObjects.Arc
}

export function createPlayerEntity(scene: Phaser.Scene): PlayerEntity {
  const player = scene.add.circle(WIDTH / 2, HEIGHT - 100, 11, 0xf5f7ff)
  scene.physics.add.existing(player)
  const playerBody = player.body as Phaser.Physics.Arcade.Body
  playerBody.setAllowGravity(false)
  playerBody.setCircle(11)

  const hitbox = scene.add.circle(player.x, player.y, 3, 0xff4f9a)
  hitbox.setStrokeStyle(1, 0xffffff, 0.9)
  scene.physics.add.existing(hitbox)
  const hitboxBody = hitbox.body as Phaser.Physics.Arcade.Body
  hitboxBody.setAllowGravity(false)
  hitboxBody.setCircle(3)
  hitboxBody.setImmovable(true)

  return { player, hitbox }
}
