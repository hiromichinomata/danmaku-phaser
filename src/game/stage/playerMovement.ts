import Phaser from 'phaser'
import { HEIGHT, PLAYER_FOCUS_SPEED, PLAYER_SPEED, WIDTH } from '../constants.ts'
import type { GameKeyboard } from './keyboard.ts'

export function updatePlayerMovement(
  delta: number,
  kb: GameKeyboard,
  player: Phaser.GameObjects.Arc,
  hitbox: Phaser.GameObjects.Arc
): void {
  let dx = 0
  let dy = 0

  const leftPressed = kb.cursors.left.isDown || kb.keys.left.isDown
  const rightPressed = kb.cursors.right.isDown || kb.keys.right.isDown
  const upPressed = kb.cursors.up.isDown || kb.keys.up.isDown
  const downPressed = kb.cursors.down.isDown || kb.keys.down.isDown

  if (leftPressed) dx -= 1
  if (rightPressed) dx += 1
  if (upPressed) dy -= 1
  if (downPressed) dy += 1

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy)
    dx /= len
    dy /= len
  }

  const focus = kb.keys.focus.isDown
  const speed = focus ? PLAYER_FOCUS_SPEED : PLAYER_SPEED
  const step = speed * (delta / 1000)

  player.x = Phaser.Math.Clamp(player.x + dx * step, 24, WIDTH - 24)
  player.y = Phaser.Math.Clamp(player.y + dy * step, 24, HEIGHT - 24)

  hitbox.setPosition(player.x, player.y)
  hitbox.setVisible(focus)
}
