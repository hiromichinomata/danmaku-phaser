import Phaser from 'phaser'
import { HEIGHT, WIDTH } from './constants.ts'
import { MainScene } from '../scenes/MainScene.ts'

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#080c1f',
    scene: [MainScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  })
}
