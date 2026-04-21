import Phaser from 'phaser'
import { HEIGHT, WIDTH } from '../constants.ts'

export type EndPauseOptions = {
  /** physics.pause の前に呼ぶ（例: ボス弾幕タイマー解除） */
  beforePause?: () => void
  /** ステージクリア時など、中央に到達スコアを大きく表示する */
  finalScore?: number
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

  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  const depth = 100
  const font = { fontFamily: 'monospace', color: '#ffffff' } as const

  if (options?.finalScore !== undefined) {
    const scoreStr = options.finalScore.toString().padStart(7, '0')
    scene.add
      .text(cx, cy - 110, title, { ...font, fontSize: '38px', align: 'center' })
      .setOrigin(0.5)
      .setDepth(depth)
    scene.add
      .text(cx, cy - 30, 'SCORE', { ...font, fontSize: '22px', align: 'center', color: '#b8c8ff' })
      .setOrigin(0.5)
      .setDepth(depth)
    scene.add
      .text(cx, cy + 28, scoreStr, { ...font, fontSize: '52px', align: 'center' })
      .setOrigin(0.5)
      .setDepth(depth)
    scene.add
      .text(cx, cy + 130, actionLine, { ...font, fontSize: '26px', align: 'center' })
      .setOrigin(0.5)
      .setDepth(depth)
  } else {
    scene.add
      .text(cx, cy, `${title}\n\n${actionLine}`, {
        align: 'center',
        ...font,
        fontSize: '36px',
      })
      .setOrigin(0.5)
      .setDepth(depth)
  }
  const keyboard = scene.input.keyboard
  if (!keyboard) {
    throw new Error('Keyboard input is unavailable.')
  }
  const retryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
  retryKey.once('down', () => scene.scene.restart())
}
