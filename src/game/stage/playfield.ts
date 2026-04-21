import Phaser from 'phaser'
import { addGameBackground } from './background.ts'
import { createGameKeyboard, type GameKeyboard } from './keyboard.ts'
import { createPlayerEntity, type PlayerEntity } from './createPlayer.ts'

export type PlayfieldContext = GameKeyboard &
  PlayerEntity & {
    playerBullets: Phaser.Physics.Arcade.Group
    enemyBullets: Phaser.Physics.Arcade.Group
    hudText: Phaser.GameObjects.Text
  }

/** 背景・入力・自機・弾グループ・HUD の共通セットアップ（ステージごとに再利用） */
export function installPlayfield(scene: Phaser.Scene): PlayfieldContext {
  addGameBackground(scene)
  const { cursors, keys } = createGameKeyboard(scene)
  const playerBullets = scene.physics.add.group()
  const enemyBullets = scene.physics.add.group()
  const { player, hitbox } = createPlayerEntity(scene)
  const hudText = scene.add.text(12, 10, '', {
    color: '#dce7ff',
    fontFamily: 'monospace',
    fontSize: '18px',
  })

  return {
    cursors,
    keys,
    player,
    hitbox,
    playerBullets,
    enemyBullets,
    hudText,
  }
}
