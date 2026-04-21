import Phaser from 'phaser'
import { updateAllBullets } from '../../game/bullets/bulletMovement.ts'
import { PlayerAutoShot } from '../../game/bullets/playerAutoShot.ts'
import { spawnEnemyBulletArc } from '../../game/bullets/spawnEnemyBullet.ts'
import {
  ENEMY_BULLET_SPEED,
  ENEMY_HIT_FLASH_MS,
  INVINCIBLE_MS,
  WIDTH,
} from '../../game/constants.ts'
import { resolveEnemyHpMax } from '../../game/debugFlags.ts'
import { ringBulletVelocities, spiralBulletPair } from '../../game/patterns/bossDanmaku.ts'
import { SCENE_KEYS } from '../../game/registry/sceneKeys.ts'
import { showEndPauseWithRetry } from '../../game/stage/endPause.ts'
import { installPlayfield, type PlayfieldContext } from '../../game/stage/playfield.ts'
import { updatePlayerInvincibleBlink } from '../../game/stage/playerInvincible.ts'
import { updatePlayerMovement } from '../../game/stage/playerMovement.ts'
import type { RunState } from '../../game/types.ts'

/**
 * ステージ1: 単一ボス戦（リング弾 + スパイラル）
 * ステージ2では別シーンを追加し、`registry/sceneKeys` と `createGame` の列挙に登録する。
 */
export class Stage1Scene extends Phaser.Scene {
  private playfield!: PlayfieldContext
  private playerShot = new PlayerAutoShot()

  private lives = 3
  private score = 0
  /** ランタイムで解決（URL / 環境変数のデバッグ用 HP を反映） */
  private enemyHpMax = 140
  private enemyHp = 0
  private enemyAlive = true
  private isInvincible = false
  private invincibleUntil = 0
  private phase = 0
  private runState: RunState = 'playing'
  private bossRingEvent!: Phaser.Time.TimerEvent
  private bossSpiralEvent!: Phaser.Time.TimerEvent
  private enemyHitFlashUntil = 0
  private enemy!: Phaser.GameObjects.Arc

  constructor() {
    super({ key: SCENE_KEYS.stage1 })
  }

  preload(): void {
    // 外部アセットなし
  }

  private resetSessionState(): void {
    this.runState = 'playing'
    this.playerShot.reset()
    this.lives = 3
    this.score = 0
    this.enemyHpMax = resolveEnemyHpMax()
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

    this.enemy = this.add.circle(WIDTH / 2, 130, 24, 0xd44aff)
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

    const { cursors, keys, player, hitbox, playerBullets, enemyBullets } = this.playfield

    updatePlayerMovement(delta, { cursors, keys }, player, hitbox)

    const wantShot = Boolean(cursors.space?.isDown || keys.shot.isDown)
    this.playerShot.tryFire(
      this,
      playerBullets,
      time,
      wantShot,
      player.x - 8,
      player.x + 8,
      player.y - 18
    )

    this.updateEnemyPosition(time)
    updateAllBullets(playerBullets, enemyBullets, delta)

    const inv = updatePlayerInvincibleBlink(
      time,
      this.isInvincible,
      this.invincibleUntil,
      player
    )
    this.isInvincible = inv.isInvincible
    this.invincibleUntil = inv.invincibleUntil

    this.updateEnemyHitFlash(time)
    this.updateHud()
  }

  private spawnRingPattern(count: number): void {
    if (!this.enemyAlive) return
    const velocities = ringBulletVelocities(count, ENEMY_BULLET_SPEED)
    for (const v of velocities) {
      spawnEnemyBulletArc(
        this,
        this.playfield.enemyBullets,
        this.enemy.x,
        this.enemy.y,
        v.vx,
        v.vy,
        0xff9bd4
      )
    }
  }

  private spawnSpiralPattern(): void {
    if (!this.enemyAlive) return
    this.phase += 0.23
    const { pair } = spiralBulletPair(this.phase, ENEMY_BULLET_SPEED)
    for (const v of pair) {
      spawnEnemyBulletArc(
        this,
        this.playfield.enemyBullets,
        this.enemy.x,
        this.enemy.y,
        v.vx,
        v.vy,
        0xf3d0ff
      )
    }
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

    if (this.enemyHp > 0) {
      this.enemyHitFlashUntil = this.time.now + ENEMY_HIT_FLASH_MS
      this.enemy.setFillStyle(0xff8ab9)
    }

    if (this.enemyHp <= 0) {
      this.enemyHp = 0
      this.score += 5000
      this.runState = 'clear'
      this.enemyAlive = false
      this.enemy.setVisible(false)
      const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body
      enemyBody.enable = false
      showEndPauseWithRetry(this, 'STAGE CLEAR', 'R : もう一度プレイ', {
        beforePause: () => this.removeBossPatterns(),
        finalScore: this.score,
      })
    }
  }

  private onEnemyBulletHitPlayer(
    objectA: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.runState !== 'playing') return
    const hitbox =
      objectA === this.playfield.hitbox
        ? objectA
        : objectB === this.playfield.hitbox
          ? objectB
          : null
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
        beforePause: () => this.removeBossPatterns(),
      })
    }
  }

  private removeBossPatterns(): void {
    this.bossRingEvent.remove()
    this.bossSpiralEvent.remove()
  }

  private updateEnemyPosition(time: number): void {
    if (!this.enemyAlive) return
    this.enemy.x = WIDTH / 2 + Math.sin(time * 0.0012) * 120
    this.enemy.y = 125 + Math.sin(time * 0.0017) * 20
  }

  private updateEnemyHitFlash(time: number): void {
    if (!this.enemyAlive) return
    if (this.enemyHitFlashUntil === 0) return

    if (this.time.now >= this.enemyHitFlashUntil) {
      this.enemy.setFillStyle(0xd44aff)
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
      `SCORE: ${this.score.toString().padStart(7, '0')}`,
      `LIFE : ${'@'.repeat(Math.max(this.lives, 0))}`,
      this.formatBossHudLine(),
      'MOVE : Arrow / WASD',
      'SHOT : Space / Z',
      'FOCUS: Shift',
    ]
    if (this.enemyHpMax === 1) {
      lines.unshift('[DEBUG] BOSS HP = 1')
    }
    if (this.runState === 'gameover') {
      lines.push('', '--- GAME OVER ---')
    }
    this.playfield.hudText.setText(lines)
  }

  /** `|` / `.` のバーのみ。最大HPが1（デバッグ）のときはセグメント数も1 */
  private formatBossHudLine(): string {
    const cur = this.enemyHp
    const max = this.enemyHpMax
    if (max === 1) {
      const bar = cur >= 1 ? '|' : '.'
      return `BOSS : ${bar}`
    }
    const hpRate = max > 0 ? cur / max : 0
    const bar = '|'.repeat(Math.ceil(hpRate * 20)).padEnd(20, '.')
    return `BOSS : ${bar}`
  }
}
