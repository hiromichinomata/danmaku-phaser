import Phaser from 'phaser'
import { HEIGHT, WIDTH } from '../constants.ts'

export function addGameBackground(scene: Phaser.Scene): void {
  scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0a0f25).setDepth(-10)
  scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 12, HEIGHT - 12, 0x101a3b).setDepth(-9)
}
