import { MapManager } from './MapManager.js'
import { Tank } from './Tank.js'
import { Bullet } from './Bullet.js'
import { Powerup, createRandomPowerup } from './Powerup.js'
import { Explosion } from './Explosion.js'
import {
  DIRECTION, TANK_TYPE, POWERUP_TYPE, GAME_CONFIG
} from './constants.js'

const {
  TILE_SIZE, MAP_COLS, MAP_ROWS,
  SHIELD_DURATION, CLOCK_DURATION,
  MAX_ENEMIES_ON_SCREEN, TOTAL_ENEMIES_PER_LEVEL,
  PLAYER_INITIAL_LIVES
} = GAME_CONFIG

export class TankGame {
  constructor() {
    this.mapManager = new MapManager()
    this.player = null
    this.enemies = []
    this.bullets = []
    this.powerups = []
    this.explosions = []

    this.level = 1
    this.score = 0
    this.playerLives = PLAYER_INITIAL_LIVES
    this.totalEnemies = TOTAL_ENEMIES_PER_LEVEL
    this.enemiesSpawned = 0
    this.enemiesKilled = 0

    this.isRunning = false
    this.isPaused = false
    this.gameOver = false
    this.levelComplete = false
    this.baseDestroyed = false

    this.clockTimer = 0
    this.powerupSpawnTimer = 0
    this.enemySpawnTimer = 0
    this.enemySpawnDelay = 120
    this.playerBulletCount = 0

    this.onStateChange = null
    this.onExplosion = null

    this.keys = {}
    this.lastTime = 0
  }

  init(level = 1) {
    this.level = level
    this.score = 0
    this.playerLives = PLAYER_INITIAL_LIVES
    this.totalEnemies = TOTAL_ENEMIES_PER_LEVEL + (level - 1) * 4
    this.enemiesSpawned = 0
    this.enemiesKilled = 0

    this.gameOver = false
    this.levelComplete = false
    this.baseDestroyed = false
    this.isPaused = false
    this.isRunning = false

    this.clockTimer = 0
    this.powerupSpawnTimer = 0
    this.enemySpawnTimer = 60
    this.playerBulletCount = 0

    this.mapManager.init(level)
    this.enemies = []
    this.bullets = []
    this.powerups = []
    this.explosions = []

    this.spawnPlayer()
    this.notifyStateChange()
  }

  nextLevel() {
    this.level++
    const saveScore = this.score
    this.init(this.level)
    this.score = saveScore
    this.notifyStateChange()
  }

  spawnPlayer() {
    const playerX = 4 * TILE_SIZE + 2
    const playerY = (MAP_ROWS - 1) * TILE_SIZE + 2
    this.player = new Tank(playerX, playerY, TANK_TYPE.PLAYER, DIRECTION.UP)
    this.player.activateShield(3000)
  }

  spawnEnemy() {
    if (this.enemies.length >= MAX_ENEMIES_ON_SCREEN) return
    if (this.enemiesSpawned >= this.totalEnemies) return

    const spawnPoints = [
      { x: 0, y: 0 },
      { x: (MAP_COLS - 1) * TILE_SIZE, y: 0 },
      { x: Math.floor(MAP_COLS / 2) * TILE_SIZE, y: 0 }
    ]

    for (const sp of spawnPoints) {
      const sx = sp.x + 2
      const sy = sp.y + 2
      let blocked = false

      for (const tank of [this.player, ...this.enemies]) {
        if (!tank || !tank.alive) continue
        if (Math.abs(tank.x - sx) < TILE_SIZE && Math.abs(tank.y - sy) < TILE_SIZE) {
          blocked = true
          break
        }
      }

      if (!blocked) {
        const types = this.getEnemyTypesForLevel()
        const type = types[Math.floor(Math.random() * types.length)]
        const enemy = new Tank(sx, sy, type, DIRECTION.DOWN)
        this.enemies.push(enemy)
        this.enemiesSpawned++

        this.explosions.push(new Explosion(
          sx + (TILE_SIZE - 4) / 2,
          sy + (TILE_SIZE - 4) / 2,
          'normal'
        ))
        return
      }
    }
  }

  getEnemyTypesForLevel() {
    const types = [TANK_TYPE.ENEMY_BASIC]
    if (this.level >= 2) types.push(TANK_TYPE.ENEMY_FAST)
    if (this.level >= 3) types.push(TANK_TYPE.ENEMY_POWER)
    if (this.level >= 4) types.push(TANK_TYPE.ENEMY_ARMOR)
    return types
  }

  start() {
    this.isRunning = true
    this.isPaused = false
    this.lastTime = performance.now()
  }

  pause() {
    this.isPaused = true
  }

  resume() {
    this.isPaused = false
    this.lastTime = performance.now()
  }

  stop() {
    this.isRunning = false
  }

  handleKeyDown(key) {
    this.keys[key] = true
  }

  handleKeyUp(key) {
    this.keys[key] = false
  }

  handleDirectionPress(direction) {
    this._manualDir = direction
    this._manualDirActive = true
  }

  handleDirectionRelease() {
    this._manualDirActive = false
  }

  handleFirePress() {
    this._firePressed = true
  }

  update(currentTime) {
    if (!this.isRunning || this.isPaused || this.gameOver || this.levelComplete) return

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.updatePlayer(deltaTime)
    this.updateEnemies(deltaTime)
    this.updateBullets()
    this.updatePowerups()
    this.updateExplosions()

    if (this.clockTimer > 0) {
      this.clockTimer -= deltaTime
      if (this.clockTimer <= 0) this.clockTimer = 0
    }

    this.enemySpawnTimer--
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy()
      this.enemySpawnTimer = this.enemySpawnDelay
    }

    this.powerupSpawnTimer++
    if (this.powerupSpawnTimer >= 1200) {
      this.powerupSpawnTimer = 0
      if (this.powerups.length < 2) {
        this.powerups.push(createRandomPowerup())
      }
    }

    if (this.player && !this.player.alive && !this.gameOver) {
      if (this.playerLives > 0) {
        this.playerLives--
        this.notifyStateChange()
        setTimeout(() => {
          if (!this.gameOver) this.spawnPlayer()
        }, 800)
      } else {
        this.endGame()
      }
    }

    if (this.enemiesKilled >= this.totalEnemies && this.enemies.length === 0) {
      this.levelComplete = true
      this.isPaused = true
    }

    if (this.baseDestroyed) {
      this.endGame()
    }
  }

  updatePlayer(deltaTime) {
    if (!this.player || !this.player.alive) return

    this.player.updateShield(deltaTime)

    let direction = null
    if (this._manualDirActive && this._manualDir !== undefined) {
      direction = this._manualDir
    } else {
      if (this.keys['ArrowUp'] || this.keys['KeyW']) direction = DIRECTION.UP
      else if (this.keys['ArrowRight'] || this.keys['KeyD']) direction = DIRECTION.RIGHT
      else if (this.keys['ArrowDown'] || this.keys['KeyS']) direction = DIRECTION.DOWN
      else if (this.keys['ArrowLeft'] || this.keys['KeyA']) direction = DIRECTION.LEFT
    }

    if (direction !== null) {
      const allTanks = [this.player, ...this.enemies]
      this.player.move(direction, this.mapManager, 0, 0, allTanks)
    } else {
      this.player.isMoving = false
    }

    const shouldFire = this._firePressed || this.keys['Space'] || this.keys['KeyJ']
    if (shouldFire) {
      this.playerFire()
      this._firePressed = false
    }
  }

  playerFire() {
    const activePlayerBullets = this.bullets.filter(
      b => b.active && b.ownerRef === this.player
    )
    if (activePlayerBullets.length >= this.player.maxBullets) return

    const bulletData = this.player.fire()
    if (bulletData) {
      this.bullets.push(new Bullet(
        bulletData.x, bulletData.y, bulletData.direction,
        bulletData.speed, bulletData.damage,
        bulletData.owner, bulletData.ownerRef, bulletData.canBreakSteel
      ))
    }
  }

  updateEnemies(deltaTime) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue

      if (this.clockTimer > 0) continue

      const aiResult = enemy.updateAI(
        this.player, this.mapManager, 0, 0,
        [this.player, ...this.enemies]
      )

      if (aiResult.shouldMove && aiResult.direction !== undefined) {
        const allTanks = [this.player, ...this.enemies]
        enemy.move(aiResult.direction, this.mapManager, 0, 0, allTanks)
      } else {
        enemy.isMoving = false
      }

      if (aiResult.shouldFire) {
        const activeBullets = this.bullets.filter(
          b => b.active && b.ownerRef === enemy
        )
        if (activeBullets.length < enemy.maxBullets) {
          const bulletData = enemy.fire()
          if (bulletData) {
            this.bullets.push(new Bullet(
              bulletData.x, bulletData.y, bulletData.direction,
              bulletData.speed, bulletData.damage,
              bulletData.owner, bulletData.ownerRef, bulletData.canBreakSteel
            ))
          }
        }
      }
    }

    this.enemies = this.enemies.filter(e => e.alive || e.explosionAdded !== true)
  }

  updateBullets() {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue

      bullet.update()

      const mapHit = bullet.checkMapCollision(this.mapManager)
      if (mapHit) {
        if (mapHit.type === 'base') {
          this.baseDestroyed = true
          this.explosions.push(new Explosion(
            (mapHit.col + 0.5) * TILE_SIZE,
            (mapHit.row + 0.5) * TILE_SIZE,
            'large'
          ))
        } else if (mapHit.type === 'brick' || mapHit.type === 'steel_broken') {
          this.explosions.push(new Explosion(
            bullet.x + bullet.width / 2,
            bullet.y + bullet.height / 2,
            'normal'
          ))
        } else {
          this.explosions.push(new Explosion(
            bullet.x + bullet.width / 2,
            bullet.y + bullet.height / 2,
            'normal'
          ))
        }
        continue
      }

      const bulletHit = bullet.checkBulletCollision(this.bullets)
      if (bulletHit) {
        this.explosions.push(new Explosion(
          bullet.x + bullet.width / 2,
          bullet.y + bullet.height / 2,
          'normal'
        ))
        continue
      }

      const tanksToCheck = bullet.owner === 'player' ? this.enemies : [this.player]
      const tankHit = bullet.checkTankCollision(tanksToCheck)
      if (tankHit) {
        this.explosions.push(new Explosion(
          bullet.x + bullet.width / 2,
          bullet.y + bullet.height / 2,
          'normal'
        ))
        if (tankHit.killed) {
          const tank = tankHit.tank
          this.explosions.push(new Explosion(
            tank.x + tank.width / 2,
            tank.y + tank.height / 2,
            'large'
          ))
          if (tank.type !== TANK_TYPE.PLAYER) {
            this.score += tank.score
            this.enemiesKilled++
            if (Math.random() < 0.15) {
              const p = createRandomPowerup()
              p.x = tank.x
              p.y = tank.y
              this.powerups.push(p)
            }
            this.notifyStateChange()
          }
        }
      }
    }

    this.bullets = this.bullets.filter(b => b.active)
  }

  updatePowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i]
      p.update()

      if (!p.active) {
        this.powerups.splice(i, 1)
        continue
      }

      if (this.player && this.player.alive && p.checkCollision(this.player)) {
        this.applyPowerup(p.type)
        p.active = false
        this.powerups.splice(i, 1)
        this.notifyStateChange()
      }
    }
  }

  applyPowerup(type) {
    switch (type) {
      case POWERUP_TYPE.STAR:
        this.player.upgradeStar()
        this.score += 500
        break
      case POWERUP_TYPE.SHIELD:
        this.player.activateShield(SHIELD_DURATION)
        this.score += 500
        break
      case POWERUP_TYPE.BOMB:
        for (const enemy of this.enemies) {
          if (enemy.alive) {
            enemy.alive = false
            this.score += enemy.score
            this.enemiesKilled++
            this.explosions.push(new Explosion(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              'large'
            ))
          }
        }
        break
      case POWERUP_TYPE.LIFE:
        this.playerLives = Math.min(9, this.playerLives + 1)
        this.score += 500
        break
      case POWERUP_TYPE.SHOVEL:
        this.mapManager.reinforceBase()
        this.score += 500
        break
      case POWERUP_TYPE.CLOCK:
        this.clockTimer = CLOCK_DURATION
        this.score += 500
        break
    }
  }

  updateExplosions() {
    for (const exp of this.explosions) {
      exp.update()
    }
    this.explosions = this.explosions.filter(e => e.active)
  }

  endGame() {
    this.gameOver = true
    this.isRunning = false
    this.notifyStateChange()
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        level: this.level,
        lives: this.playerLives,
        enemiesKilled: this.enemiesKilled,
        enemiesTotal: this.totalEnemies,
        gameOver: this.gameOver,
        levelComplete: this.levelComplete
      })
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const { offsetX, offsetY } = this.mapManager.render(ctx, canvasWidth, canvasHeight)

    for (const p of this.powerups) {
      p.render(ctx, offsetX, offsetY)
    }

    if (this.player) {
      this.player.render(ctx, offsetX, offsetY)
    }
    for (const enemy of this.enemies) {
      enemy.render(ctx, offsetX, offsetY)
    }

    for (const bullet of this.bullets) {
      bullet.render(ctx, offsetX, offsetY)
    }

    this.mapManager.renderGrass(ctx, canvasWidth, canvasHeight)

    for (const exp of this.explosions) {
      exp.render(ctx, offsetX, offsetY)
    }

    this.renderEnemyIndicator(ctx, canvasWidth, canvasHeight)
  }

  renderEnemyIndicator(ctx, canvasWidth, canvasHeight) {
    const remaining = this.totalEnemies - this.enemiesKilled
    const rows = Math.ceil(remaining / 10)
    const iconSize = 12
    const gap = 4
    const startX = canvasWidth - (rows * (iconSize + gap)) - 10
    const startY = 10

    for (let i = 0; i < remaining; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      const x = startX + row * (iconSize + gap)
      const y = startY + col * (iconSize + gap)

      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x, y, iconSize, iconSize)
      ctx.fillStyle = '#b91c1c'
      ctx.fillRect(x + iconSize / 2 - 1, y, 2, iconSize / 2 + 2)
    }
  }
}
