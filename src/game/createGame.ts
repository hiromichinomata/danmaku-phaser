import Phaser from 'phaser'
import { HEIGHT, WIDTH } from './constants.ts'
import { Stage1Scene } from '../scenes/stages/Stage1Scene.ts'
import { Stage2Scene } from '../scenes/stages/Stage2Scene.ts'

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#080c1f',
    scene: [Stage1Scene, Stage2Scene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  })
}
