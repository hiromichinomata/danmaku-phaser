import Phaser from 'phaser'
import { updateAllBullets } from '../../game/bullets/bulletMovement.ts'
import { PlayerAutoShot } from '../../game/bullets/playerAutoShot.ts'
import { spawnEnemyBulletArc } from '../../game/bullets/spawnEnemyBullet.ts'
import { ENEMY_BULLET_SPEED, ENEMY_HIT_FLASH_MS, INVINCIBLE_MS, WIDTH } from '../../game/constants.ts'
import { resolveEnemyHpMax } from '../../game/debugFlags.ts'
import {
  doubleRingVelocities,
  octDirectionBurst,
  rotatingSpokeVelocities,
  tightAimedFan,
} from '../../game/patterns/stage3Danmaku.ts'
import { SCENE_KEYS } from '../../game/registry/sceneKeys.ts'
import { showEndPauseWithRetry } from '../../game/stage/endPause.ts'
import { installPlayfield, type PlayfieldContext } from '../../game/stage/playfield.ts'
import { updatePlayerInvincibleBlink } from '../../game/stage/playerInvincible.ts'
import { updatePlayerMovement } from '../../game/stage/playerMovement.ts'
import type { RunState, StageStartData } from '../../game/types.ts'

/** 最終ステージ：HP多め・複合パターン（見栄えは維持しつつ避け幅を少し確保） */
const STAGE3_BASE_HP = 420

export class Stage3Scene extends Phaser.Scene {
  private playfield!: PlayfieldContext
  private playerShot = new PlayerAutoShot()
  private lives = 3
  private score = 0
  private enemyHpMax = STAGE3_BASE_HP
  private enemyHp = STAGE3_BASE_HP
  private enemyAlive = true
  private isInvincible = false
  private invincibleUntil = 0
  private runState: RunState = 'playing'
  private phase = 0
  private enemyHitFlashUntil = 0
  private doubleRingEvent!: Phaser.Time.TimerEvent
  private crossBurstEvent!: Phaser.Time.TimerEvent
  private spokeSpiralEvent!: Phaser.Time.TimerEvent
  private aimedClawEvent!: Phaser.Time.TimerEvent
  private enemy!: Phaser.GameObjects.Arc

  constructor() {
    super({ key: SCENE_KEYS.stage3 })
  }

  init(data?: StageStartData): void {
    this.score = data?.score ?? 0
    this.lives = data?.lives ?? 3
  }

  private resetSessionState(): void {
    this.runState = 'playing'
    this.playerShot.reset()
    this.enemyHpMax = resolveEnemyHpMax() === 1 ? 1 : STAGE3_BASE_HP
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

    this.enemy = this.add.circle(WIDTH / 2, 105, 38, 0x2a0a18)
    this.enemy.setStrokeStyle(4, 0xffc14d, 0.95)
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

    this.doubleRingEvent = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => this.spawnDoubleRing(),
    })

    this.crossBurstEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnCrossBurst(),
    })

    this.spokeSpiralEvent = this.time.addEvent({
      delay: 135,
      loop: true,
      callback: () => this.spawnRotatingSpokes(),
    })

    this.aimedClawEvent = this.time.addEvent({
      delay: 580,
      loop: true,
      callback: () => this.spawnAimedClaw(),
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

  private spawnDoubleRing(): void {
    if (!this.enemyAlive) return
    const { outer, inner } = doubleRingVelocities(22, 14, ENEMY_BULLET_SPEED - 15, ENEMY_BULLET_SPEED + 45)
    for (const v of outer) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xff6b5a)
    }
    for (const v of inner) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xffc14d)
    }
  }

  private spawnCrossBurst(): void {
    if (!this.enemyAlive) return
    for (const v of octDirectionBurst(ENEMY_BULLET_SPEED + 28)) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xe8d4ff)
    }
  }

  private spawnRotatingSpokes(): void {
    if (!this.enemyAlive) return
    this.phase += 0.095
    const vels = rotatingSpokeVelocities(this.phase, 10, ENEMY_BULLET_SPEED + 12)
    for (const v of vels) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xff4488)
    }
  }

  private spawnAimedClaw(): void {
    if (!this.enemyAlive) return
    const vels = tightAimedFan(
      this.enemy.x,
      this.enemy.y,
      this.playfield.player.x,
      this.playfield.player.y,
      ENEMY_BULLET_SPEED + 52,
      7,
      Math.PI / 2.05
    )
    for (const v of vels) {
      spawnEnemyBulletArc(this, this.playfield.enemyBullets, this.enemy.x, this.enemy.y, v.vx, v.vy, 0xfff0b0)
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
    this.score += 15

    if (this.enemyHp > 0) {
      this.enemyHitFlashUntil = this.time.now + ENEMY_HIT_FLASH_MS
      this.enemy.setFillStyle(0xff9a4a)
      return
    }

    this.enemyHp = 0
    this.score += 15000
    this.runState = 'clear'
    this.enemyAlive = false
    this.enemy.setVisible(false)
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
    enemyBody.enable = false
    showEndPauseWithRetry(this, 'GAME CLEAR', 'R : もう一度プレイ', {
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
    this.doubleRingEvent.remove()
    this.crossBurstEvent.remove()
    this.spokeSpiralEvent.remove()
    this.aimedClawEvent.remove()
  }

  private updateEnemyPosition(time: number): void {
    if (!this.enemyAlive) return
    const t = time * 0.001
    this.enemy.x = WIDTH / 2 + Math.sin(t) * 100 + Math.sin(t * 2.1) * 35
    this.enemy.y = 105 + Math.cos(t * 1.3) * 22
  }

  private updateEnemyHitFlash(time: number): void {
    if (!this.enemyAlive || this.enemyHitFlashUntil === 0) return
    if (this.time.now >= this.enemyHitFlashUntil) {
      this.enemy.setFillStyle(0x2a0a18)
      this.enemy.setAlpha(1)
      this.enemyHitFlashUntil = 0
      return
    }
    this.enemy.setAlpha(0.4 + Math.sin(time * 0.05) * 0.35)
  }

  private updateHud(): void {
    if (this.runState === 'clear') {
      this.playfield.hudText.setVisible(false)
      return
    }
    this.playfield.hudText.setVisible(true)
    const lines = [
      `STAGE: 3 (FINAL)`,
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
