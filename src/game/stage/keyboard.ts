import Phaser from 'phaser'

export type GameKeyboardKeys = {
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  shot: Phaser.Input.Keyboard.Key
  focus: Phaser.Input.Keyboard.Key
}

export type GameKeyboard = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  keys: GameKeyboardKeys
}

export function createGameKeyboard(scene: Phaser.Scene): GameKeyboard {
  const keyboard = scene.input.keyboard
  if (!keyboard) {
    throw new Error('Keyboard input is unavailable.')
  }

  return {
    cursors: keyboard.createCursorKeys(),
    keys: {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      focus: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      shot: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
    },
  }
}
