import Phaser from 'phaser'
import { HEIGHT, WIDTH } from '../constants.ts'

export type EndPauseOptions = {
  /** physics.pause の前に呼ぶ（例: ボス弾幕タイマー解除） */
  beforePause?: () => void
}

/**
 * クリア / ゲームオーバー共通のポーズ表示。R でシーン再起動（ステージ側で差し替え可）
 */
export function showEndPauseWithRetry(
  scene: Phaser.Scene,
  title: string,
  actionLine: string,
  options?: EndPauseOptions
): void {
  options?.beforePause?.()
  scene.physics.pause()
  scene.add
    .text(WIDTH / 2, HEIGHT / 2, `${title}\n\n${actionLine}`, {
      align: 'center',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '36px',
    })
    .setOrigin(0.5)
    .setDepth(100)
  const keyboard = scene.input.keyboard
  if (!keyboard) {
    throw new Error('Keyboard input is unavailable.')
  }
  const retryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
  retryKey.once('down', () => scene.scene.restart())
}
