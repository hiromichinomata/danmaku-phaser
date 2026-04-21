import Phaser from 'phaser'
import { updateAllBullets } from '../../game/bullets/bulletMovement.ts'
import { PlayerAutoShot } from '../../game/bullets/playerAutoShot.ts'
import { spawnEnemyBulletArc } from '../../game/bullets/spawnEnemyBullet.ts'
import { ENEMY_BULLET_SPEED, ENEMY_HIT_FLASH_MS, INVINCIBLE_MS, WIDTH } from '../../game/constants.ts'
import { resolveEnemyHpMax } from '../../game/debugFlags.ts'
import { SCENE_KEYS } from '../../game/registry/sceneKeys.ts'
import { showEndPauseWithRetry } from '../../game/stage/endPause.ts'
import { installPlayfield, type PlayfieldContext } from '../../game/stage/playfield.ts'
import { updatePlayerInvincibleBlink } from '../../game/stage/playerInvincible.ts'
import { updatePlayerMovement } from '../../game/stage/playerMovement.ts'
import type { RunState, StageStartData } from '../../game/types.ts'
import { aimedFanVelocities, rotatingFlowerVelocities } from '../../game/patterns/stage2Danmaku.ts'

const STAGE2_BASE_HP = 220

export class Stage2Scene extends Phaser.Scene {
  private playfield!: PlayfieldContext
  private playerShot = new PlayerAutoShot()
  private lives = 3
  private score = 0
  private enemyHpMax = STAGE2_BASE_HP
  private enemyHp = STAGE2_BASE_HP
  private enemyAlive = true
  private isInvincible = false
  private invincibleUntil = 0
  private runState: RunState = 'playing'
  private phase = 0
  private enemyHitFlashUntil = 0
  private aimedFanEvent!: Phaser.Time.TimerEvent
  private flowerEvent!: Phaser.Time.TimerEvent
  private enemy!: Phaser.GameObjects.Arc

  constructor() {
    super({ key: SCENE_KEYS.stage2 })
  }

  init(data?: StageStartData): void {
    this.score = data?.score ?? 0
    this.lives = data?.lives ?? 3
  }

  private resetSessionState(): void {
    this.runState = 'playing'
    this.playerShot.reset()
    this.enemyHpMax = resolveEnemyHpMax() === 1 ? 1 : STAGE2_BASE_HP
    this.enemyHp = this.enemyHpMax
    this.enemyAlive = true
    this.isInvincible = false
    this.invincibleUntil = 0
    this.phase = 0
    this.enemyHitFlashUntil = 0
  }

  create(): void {
    this.resetSessionState()
    this.physics.resume()
    this.playfield = installPlayfield(this)

    this.enemy = this.add.circle(WIDTH / 2, 120, 28, 0x6ec7ff)
    this.enemy.setStrokeStyle(2, 0xe1f7ff, 0.7)
    this.physics.add.existing(this.enemy)
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
    enemyBody.setAllowGravity(false)
    enemyBody.setImmovable(true)

    this.physics.add.overlap(
      this.playfield.playerBullets,
      this.enemy,
      this.onPlayerBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.playfield.enemyBullets,
      this.playfield.hitbox,
      this.onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.aimedFanEvent = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => this.spawnAimedFan(),
    })

    this.flowerEvent = this.time.addEvent({
      delay: 170,
      loop: true,
      callback: () => this.spawnRotatingFlower(),
    })
  }

  update(time: number, delta: number): void {
    if (this.runState !== 'playing') {
      this.updateHud()
      return
    }

    const { cursors, keys, player, hitbox, playerBullets, enemyBullets } = this.playfield
    updatePlayerMovement(delta, { cursors, keys }, player, hitbox)

    const wantShot = Boolean(cursors.space?.isDown || keys.shot.isDown)
    this.playerShot.tryFire(this, playerBullets, time, wantShot, player.x - 8, player.x + 8, player.y - 18)

    this.updateEnemyPosition(time)
    updateAllBullets(playerBullets, enemyBullets, delta)

    const inv = updatePlayerInvincibleBlink(time, this.isInvincible, this.invincibleUntil, player)
    this.isInvincible = inv.isInvincible
    this.invincibleUntil = inv.invincibleUntil

    this.updateEnemyHitFlash(time)
    this.updateHud()
  }

  private spawnAimedFan(): void {
    if (!this.enemyAlive) return
    const vels = aimedFanVelocities(
      this.enemy.x,
      this.enemy.y,
      this.playfield.player.x,
      this.playfield.player.y,
      ENEMY_BULLET_SPEED + 30,
      7,
      Math.PI / 3.2
    )
    for (const v of vels) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0x8fe0ff)
    }
  }

  private spawnRotatingFlower(): void {
    if (!this.enemyAlive) return
    this.phase += 0.16
    const vels = rotatingFlowerVelocities(this.phase, 8, ENEMY_BULLET_SPEED - 10)
    for (const v of vels) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xbad8ff)
    }
  }

  private onPlayerBulletHitEnemy(
    objectA: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.runState !== 'playing') return
    const enemy = objectA === this.enemy ? objectA : objectB === this.enemy ? objectB : null
    const playerBullet = objectA !== this.enemy ? objectA : objectB !== this.enemy ? objectB : null
    if (!enemy || !playerBullet || !this.enemyAlive) return
    playerBullet.destroy()
    this.enemyHp -= 1
    this.score += 12

    if (this.enemyHp > 0) {
      this.enemyHitFlashUntil = this.time.now + ENEMY_HIT_FLASH_MS
      this.enemy.setFillStyle(0xa3eeff)
      return
    }

    this.enemyHp = 0
    this.score += 8000
    this.runState = 'clear'
    this.enemyAlive = false
    this.enemy.setVisible(false)
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
    enemyBody.enable = false
    showEndPauseWithRetry(this, 'STAGE 2 CLEAR', 'R : もう一度プレイ', {
      beforePause: () => this.removePatterns(),
      finalScore: this.score,
    })
  }

  private onEnemyBulletHitPlayer(
    objectA: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.runState !== 'playing') return
    const hitbox =
      objectA === this.playfield.hitbox ? objectA : objectB === this.playfield.hitbox ? objectB : null
    const enemyBullet =
      objectA !== this.playfield.hitbox ? objectA : objectB !== this.playfield.hitbox ? objectB : null
    if (!hitbox || !enemyBullet) return
    enemyBullet.destroy()
    if (this.isInvincible) return

    this.lives -= 1
    this.isInvincible = true
    this.invincibleUntil = this.time.now + INVINCIBLE_MS
    this.playfield.player.setFillStyle(0xff8ab9)

    if (this.lives <= 0) {
      this.runState = 'gameover'
      showEndPauseWithRetry(this, 'GAME OVER', 'R : もう一度プレイ', {
        beforePause: () => this.removePatterns(),
      })
    }
  }

  private removePatterns(): void {
    this.aimedFanEvent.remove()
    this.flowerEvent.remove()
  }

  private updateEnemyPosition(time: number): void {
    if (!this.enemyAlive) return
    this.enemy.x = WIDTH / 2 + Math.sin(time * 0.0018) * 150
    this.enemy.y = 120 + Math.cos(time * 0.0024) * 26
  }

  private updateEnemyHitFlash(time: number): void {
    if (!this.enemyAlive || this.enemyHitFlashUntil === 0) return
    if (this.time.now >= this.enemyHitFlashUntil) {
      this.enemy.setFillStyle(0x6ec7ff)
      this.enemy.setAlpha(1)
      this.enemyHitFlashUntil = 0
      return
    }
    this.enemy.setAlpha(0.45 + Math.sin(time * 0.04) * 0.3)
  }

  private updateHud(): void {
    if (this.runState === 'clear') {
      this.playfield.hudText.setVisible(false)
      return
    }
    this.playfield.hudText.setVisible(true)
    const lines = [
      `STAGE: 2`,
      `SCORE: ${this.score.toString().padStart(7, '0')}`,
      `LIFE : ${'@'.repeat(Math.max(this.lives, 0))}`,
      this.formatBossHudLine(),
      'MOVE : Arrow / WASD',
      'SHOT : Space / Z',
      'FOCUS: Shift',
    ]
    if (this.enemyHpMax === 1) lines.unshift('[DEBUG] BOSS HP = 1')
    if (this.runState === 'gameover') lines.push('', '--- GAME OVER ---')
    this.playfield.hudText.setText(lines)
  }

  private formatBossHudLine(): string {
    if (this.enemyHpMax === 1) return `BOSS : ${this.enemyHp >= 1 ? '|' : '.'}`
    const hpRate = this.enemyHpMax > 0 ? this.enemyHp / this.enemyHpMax : 0
    const bar = '|'.repeat(Math.ceil(hpRate * 20)).padEnd(20, '.')
    return `BOSS : ${bar}`
  }
}
