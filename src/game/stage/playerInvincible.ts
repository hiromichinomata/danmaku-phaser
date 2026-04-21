export function updatePlayerInvincibleBlink(
  time: number,
  isInvincible: boolean,
  invincibleUntil: number,
  player: Phaser.GameObjects.Arc
): { isInvincible: boolean; invincibleUntil: number } {
  if (!isInvincible) {
    return { isInvincible: false, invincibleUntil }
  }
  if (time > invincibleUntil) {
    player.setFillStyle(0xf5f7ff)
    player.setAlpha(1)
    return { isInvincible: false, invincibleUntil }
  }
  player.setAlpha(0.45 + Math.sin(time * 0.04) * 0.3)
  return { isInvincible: true, invincibleUntil }
}
