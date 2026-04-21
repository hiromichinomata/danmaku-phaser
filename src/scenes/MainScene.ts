import Phaser from 'phaser'
import {
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  ENEMY_HP_MAX,
  HEIGHT,
  INVINCIBLE_MS,
  PLAYER_FOCUS_SPEED,
  PLAYER_SPEED,
  WIDTH,
} from '../game/constants.ts'
import type { BulletData, RunState } from '../game/types.ts'

export class MainScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    shot: Phaser.Input.Keyboard.Key
    focus: Phaser.Input.Keyboard.Key
  }
  private player!: Phaser.GameObjects.Arc
  private hitbox!: Phaser.GameObjects.Arc
  private enemy!: Phaser.GameObjects.Arc
  private playerBullets!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private shotTimer = 0
  private lives = 3
  private score = 0
  private enemyHp = ENEMY_HP_MAX
  private enemyAlive = true
  private isInvincible = false
  private invincibleUntil = 0
  private hudText!: Phaser.GameObjects.Text
  private phase = 0
  private runState: RunState = 'playing'
  private bossRingEvent!: Phaser.Time.TimerEvent
  private bossSpiralEvent!: Phaser.Time.TimerEvent

  constructor() {
    super('main')
  }

  preload(): void {
    // No external assets: draw everything with primitive shapes.
  }

  /**
   * `scene.restart()` は同一インスタンスを再利用するため、
   * フィールドは自動では戻らない。create のたびに初期化する。
   */
  private resetSessionState(): void {
    this.runState = 'playing'
    this.shotTimer = 0
    this.lives = 3
    this.score = 0
    this.enemyHp = ENEMY_HP_MAX
    this.enemyAlive = true
    this.isInvincible = false
    this.invincibleUntil = 0
    this.phase = 0
  }

  create(): void {
    this.resetSessionState()
    this.physics.resume()

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0a0f25).setDepth(-10)
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 12, HEIGHT - 12, 0x101a3b).setDepth(-9)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.')
    }

    this.cursors = keyboard.createCursorKeys()
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      focus: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      shot: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
    }

    this.playerBullets = this.physics.add.group()
    this.enemyBullets = this.physics.add.group()

    this.player = this.add.circle(WIDTH / 2, HEIGHT - 100, 11, 0xf5f7ff)
    this.physics.add.existing(this.player)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.setAllowGravity(false)
    playerBody.setCircle(11)

    this.hitbox = this.add.circle(this.player.x, this.player.y, 3, 0xff4f9a)
    this.hitbox.setStrokeStyle(1, 0xffffff, 0.9)
    this.physics.add.existing(this.hitbox)
    const hitboxBody = this.hitbox.body as Phaser.Physics.Arcade.Body
    hitboxBody.setAllowGravity(false)
    hitboxBody.setCircle(3)
    hitboxBody.setImmovable(true)

    this.enemy = this.add.circle(WIDTH / 2, 130, 24, 0xd44aff)
    this.physics.add.existing(this.enemy)
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
    enemyBody.setAllowGravity(false)
    enemyBody.setImmovable(true)

    this.hudText = this.add.text(12, 10, '', {
      color: '#dce7ff',
      fontFamily: 'monospace',
      fontSize: '18px',
    })

    this.physics.add.overlap(
      this.playerBullets,
      this.enemy,
      this.onPlayerBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.enemyBullets,
      this.hitbox,
      this.onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.bossRingEvent = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.spawnRingPattern(18),
    })

    this.bossSpiralEvent = this.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => this.spawnSpiralPattern(),
    })
  }

  update(time: number, delta: number): void {
    if (this.runState !== 'playing') {
      this.updateHud()
      return
    }

    this.updatePlayerMovement(delta)
    this.updateAutoShot(time)
    this.updateEnemyPosition(time)
    this.updateBullets(delta)
    this.updateInvincibleState(time)
    this.updateHud()
  }

  private updatePlayerMovement(delta: number): void {
    let dx = 0
    let dy = 0

    const leftPressed = this.cursors.left.isDown || this.keys.left.isDown
    const rightPressed = this.cursors.right.isDown || this.keys.right.isDown
    const upPressed = this.cursors.up.isDown || this.keys.up.isDown
    const downPressed = this.cursors.down.isDown || this.keys.down.isDown

    if (leftPressed) dx -= 1
    if (rightPressed) dx += 1
    if (upPressed) dy -= 1
    if (downPressed) dy += 1

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy)
      dx /= len
      dy /= len
    }

    const focus = this.keys.focus.isDown
    const speed = focus ? PLAYER_FOCUS_SPEED : PLAYER_SPEED
    const step = speed * (delta / 1000)

    this.player.x = Phaser.Math.Clamp(this.player.x + dx * step, 24, WIDTH - 24)
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * step, 24, HEIGHT - 24)

    this.hitbox.setPosition(this.player.x, this.player.y)
    this.hitbox.setVisible(focus)
  }

  private updateAutoShot(time: number): void {
    if (!(this.cursors.space?.isDown || this.keys.shot.isDown)) {
      this.shotTimer = 0
      return
    }

    if (time < this.shotTimer) return
    this.shotTimer = time + 75

    this.spawnPlayerBullet(this.player.x - 8, this.player.y - 18)
    this.spawnPlayerBullet(this.player.x + 8, this.player.y - 18)
  }

  private spawnPlayerBullet(x: number, y: number): void {
    const bullet = this.add.rectangle(x, y, 4, 14, 0x8ef8ff)
    this.physics.add.existing(bullet)
    const body = bullet.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    bullet.setData('velocity', { vx: 0, vy: -BULLET_SPEED } satisfies BulletData)
    this.playerBullets.add(bullet)
  }

  private spawnRingPattern(count: number): void {
    if (!this.enemyAlive) return
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count
      const vx = Math.cos(angle) * ENEMY_BULLET_SPEED
      const vy = Math.sin(angle) * ENEMY_BULLET_SPEED
      this.spawnEnemyBullet(this.enemy.x, this.enemy.y, vx, vy, 0xff9bd4)
    }
  }

  private spawnSpiralPattern(): void {
    if (!this.enemyAlive) return
    this.phase += 0.23
    const speed = ENEMY_BULLET_SPEED + 60
    const angle1 = this.phase
    const angle2 = this.phase + Math.PI

    this.spawnEnemyBullet(
      this.enemy.x,
      this.enemy.y,
      Math.cos(angle1) * speed,
      Math.sin(angle1) * speed,
      0xf3d0ff
    )
    this.spawnEnemyBullet(
      this.enemy.x,
      this.enemy.y,
      Math.cos(angle2) * speed,
      Math.sin(angle2) * speed,
      0xf3d0ff
    )
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number, color: number): void {
    const bullet = this.add.circle(x, y, 5, color)
    this.physics.add.existing(bullet)
    const body = bullet.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    ;(bullet as Phaser.GameObjects.Arc).setData('velocity', { vx, vy } satisfies BulletData)
    this.enemyBullets.add(bullet)
  }

  private onPlayerBulletHitEnemy(
    objectA: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.runState !== 'playing') return
    const enemy = objectA === this.enemy ? objectA : objectB === this.enemy ? objectB : null
    const playerBullet =
      objectA !== this.enemy ? objectA : objectB !== this.enemy ? objectB : null
    if (!enemy || !playerBullet) return
    if (!this.enemyAlive) return
    playerBullet.destroy()
    this.enemyHp -= 1
    this.score += 10

    if (this.enemyHp <= 0) {
      this.enemyHp = 0
      this.score += 5000
      this.runState = 'clear'
      this.enemyAlive = false
      this.enemy.setVisible(false)
      const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
      enemyBody.enable = false
      this.showEndPause('STAGE CLEAR', 'R : もう一度プレイ')
    }
  }

  private onEnemyBulletHitPlayer(
    objectA: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.runState !== 'playing') return
    const hitbox = objectA === this.hitbox ? objectA : objectB === this.hitbox ? objectB : null
    const enemyBullet =
      objectA !== this.hitbox ? objectA : objectB !== this.hitbox ? objectB : null
    if (!hitbox || !enemyBullet) return
    enemyBullet.destroy()
    if (this.isInvincible) return

    this.lives -= 1
    this.isInvincible = true
    this.invincibleUntil = this.time.now + INVINCIBLE_MS
    this.player.setFillStyle(0xff8ab9)

    if (this.lives <= 0) {
      this.runState = 'gameover'
      this.showEndPause('GAME OVER', 'R : もう一度プレイ')
    }
  }

  private showEndPause(title: string, actionLine: string): void {
    this.bossRingEvent.remove()
    this.bossSpiralEvent.remove()
    this.physics.pause()
    this.add
      .text(WIDTH / 2, HEIGHT / 2, `${title}\n\n${actionLine}`, {
        align: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '36px',
      })
      .setOrigin(0.5)
      .setDepth(100)
    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.')
    }
    const retryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    retryKey.once('down', () => this.scene.restart())
  }

  private updateEnemyPosition(time: number): void {
    if (!this.enemyAlive) return
    this.enemy.x = WIDTH / 2 + Math.sin(time * 0.0012) * 120
    this.enemy.y = 125 + Math.sin(time * 0.0017) * 20
  }

  private updateInvincibleState(time: number): void {
    if (!this.isInvincible) return
    if (time > this.invincibleUntil) {
      this.isInvincible = false
      this.player.setFillStyle(0xf5f7ff)
      this.player.setAlpha(1)
      return
    }
    this.player.setAlpha(0.45 + Math.sin(time * 0.04) * 0.3)
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000
    const margin = 32
    this.playerBullets.getChildren().forEach((obj) => {
      const bullet = obj as Phaser.GameObjects.Rectangle
      const velocity = bullet.getData('velocity') as BulletData | undefined
      if (velocity) {
        bullet.x += velocity.vx * dt
        bullet.y += velocity.vy * dt
        const body = bullet.body as Phaser.Physics.Arcade.Body
        body.updateFromGameObject()
      }
      if (bullet.y < -margin) bullet.destroy()
    })

    this.enemyBullets.getChildren().forEach((obj) => {
      const bullet = obj as Phaser.GameObjects.Arc
      const velocity = bullet.getData('velocity') as BulletData | undefined
      if (velocity) {
        bullet.x += velocity.vx * dt
        bullet.y += velocity.vy * dt
        const body = bullet.body as Phaser.Physics.Arcade.Body
        body.updateFromGameObject()
      }
      if (
        bullet.x < -margin ||
        bullet.x > WIDTH + margin ||
        bullet.y < -margin ||
        bullet.y > HEIGHT + margin
      ) {
        bullet.destroy()
      }
    })
  }

  private updateHud(): void {
    const hpRate = Math.max(this.enemyHp / ENEMY_HP_MAX, 0)
    const lines = [
      `SCORE: ${this.score.toString().padStart(7, '0')}`,
      `LIFE : ${'@'.repeat(Math.max(this.lives, 0))}`,
      `BOSS : ${'|'.repeat(Math.ceil(hpRate * 20)).padEnd(20, '.')}`,
      'MOVE : Arrow / WASD',
      'SHOT : Space / Z',
      'FOCUS: Shift',
    ]
    if (this.runState === 'clear') {
      lines.push('', '--- STAGE CLEAR ---')
    } else if (this.runState === 'gameover') {
      lines.push('', '--- GAME OVER ---')
    }
    this.hudText.setText(lines)
  }
}
