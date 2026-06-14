import { DIRECTION, TANK_TYPE, GAME_CONFIG } from './constants.js'

const { TILE_SIZE, PLAYER_SPEED, ENEMY_SPEED_BASIC, ENEMY_SPEED_FAST,
  ENEMY_SPEED_ARMOR, ENEMY_SPEED_POWER, FIRE_COOLDOWN } = GAME_CONFIG

const TANK_SIZE = TILE_SIZE - 4

export class Tank {
  constructor(x, y, type, direction = DIRECTION.UP) {
    this.x = x
    this.y = y
    this.type = type
    this.direction = direction
    this.width = TANK_SIZE
    this.height = TANK_SIZE
    this.isMoving = false
    this.lastFireTime = 0
    this.alive = true
    this.respawnTimer = 0
    this.animFrame = 0
    this.animTimer = 0
    this.configureStats()
  }

  configureStats() {
    switch (this.type) {
      case TANK_TYPE.PLAYER:
        this.speed = PLAYER_SPEED
        this.hp = 1
        this.maxHp = 1
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED
        this.bulletDamage = 1
        this.canBreakSteel = false
        this.maxBullets = 1
        this.color = '#fbbf24'
        this.trackColor = '#92400e'
        this.bodyColor = '#d97706'
        this.turretColor = '#f59e0b'
        this.starLevel = 0
        this.shieldActive = false
        this.shieldTimer = 0
        break
      case TANK_TYPE.ENEMY_BASIC:
        this.speed = ENEMY_SPEED_BASIC
        this.hp = 1
        this.maxHp = 1
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED
        this.bulletDamage = 1
        this.canBreakSteel = false
        this.maxBullets = 1
        this.score = 100
        this.color = '#9ca3af'
        this.trackColor = '#374151'
        this.bodyColor = '#6b7280'
        this.turretColor = '#9ca3af'
        this.aiChangeDirTimer = 0
        this.aiFireTimer = 0
        break
      case TANK_TYPE.ENEMY_FAST:
        this.speed = ENEMY_SPEED_FAST
        this.hp = 1
        this.maxHp = 1
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED_FAST
        this.bulletDamage = 1
        this.canBreakSteel = false
        this.maxBullets = 1
        this.score = 200
        this.color = '#f87171'
        this.trackColor = '#7f1d1d'
        this.bodyColor = '#ef4444'
        this.turretColor = '#f87171'
        this.aiChangeDirTimer = 0
        this.aiFireTimer = 0
        break
      case TANK_TYPE.ENEMY_ARMOR:
        this.speed = ENEMY_SPEED_ARMOR
        this.hp = 4
        this.maxHp = 4
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED
        this.bulletDamage = 1
        this.canBreakSteel = false
        this.maxBullets = 1
        this.score = 300
        this.color = '#4ade80'
        this.trackColor = '#14532d'
        this.bodyColor = '#22c55e'
        this.turretColor = '#4ade80'
        this.aiChangeDirTimer = 0
        this.aiFireTimer = 0
        break
      case TANK_TYPE.ENEMY_POWER:
        this.speed = ENEMY_SPEED_POWER
        this.hp = 1
        this.maxHp = 1
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED
        this.bulletDamage = 1
        this.canBreakSteel = true
        this.maxBullets = 2
        this.score = 400
        this.color = '#a78bfa'
        this.trackColor = '#4c1d95'
        this.bodyColor = '#8b5cf6'
        this.turretColor = '#a78bfa'
        this.aiChangeDirTimer = 0
        this.aiFireTimer = 0
        break
    }
  }

  upgradeStar() {
    if (this.type !== TANK_TYPE.PLAYER) return
    this.starLevel = Math.min(3, this.starLevel + 1)
    switch (this.starLevel) {
      case 1:
        this.bulletSpeed = GAME_CONFIG.BULLET_SPEED_FAST
        break
      case 2:
        this.maxBullets = 2
        break
      case 3:
        this.canBreakSteel = true
        this.bulletDamage = 2
        break
    }
  }

  activateShield(duration) {
    this.shieldActive = true
    this.shieldTimer = duration
  }

  updateShield(deltaTime) {
    if (this.shieldActive) {
      this.shieldTimer -= deltaTime
      if (this.shieldTimer <= 0) {
        this.shieldActive = false
        this.shieldTimer = 0
      }
    }
  }

  move(direction, mapManager, offsetX, offsetY, allTanks = []) {
    if (!this.alive) return
    this.direction = direction
    this.isMoving = true

    const dx = [0, 1, 0, -1][direction] * this.speed
    const dy = [-1, 0, 1, 0][direction] * this.speed

    const newX = this.x + dx
    const newY = this.y + dy

    const mapPixelWidth = GAME_CONFIG.MAP_COLS * TILE_SIZE
    const mapPixelHeight = GAME_CONFIG.MAP_ROWS * TILE_SIZE

    if (newX < 0 || newX + this.width > mapPixelWidth ||
        newY < 0 || newY + this.height > mapPixelHeight) {
      return
    }

    const mapNewX = newX
    const mapNewY = newY

    if (mapManager.checkCollision(mapNewX, mapNewY, this.width, this.height)) {
      return
    }

    for (const tank of allTanks) {
      if (tank === this || !tank.alive) continue
      if (this.checkTankCollision(newX, newY, tank)) {
        return
      }
    }

    this.x = newX
    this.y = newY

    this.animTimer++
    if (this.animTimer >= 6) {
      this.animTimer = 0
      this.animFrame = (this.animFrame + 1) % 2
    }
  }

  checkTankCollision(x, y, other) {
    return x < other.x + other.width &&
           x + this.width > other.x &&
           y < other.y + other.height &&
           y + this.height > other.y
  }

  canFire() {
    const now = Date.now()
    return this.alive && (now - this.lastFireTime >= FIRE_COOLDOWN)
  }

  fire() {
    if (!this.canFire()) return null
    this.lastFireTime = Date.now()

    const bulletX = this.x + this.width / 2 - 4
    const bulletY = this.y + this.height / 2 - 4

    return {
      x: bulletX,
      y: bulletY,
      direction: this.direction,
      speed: this.bulletSpeed,
      damage: this.bulletDamage,
      owner: this.type,
      ownerRef: this,
      canBreakSteel: this.canBreakSteel
    }
  }

  takeDamage(damage = 1) {
    if (this.type === TANK_TYPE.PLAYER && this.shieldActive) return false
    this.hp -= damage
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  updateAI(player, mapManager, offsetX, offsetY, allTanks) {
    if (this.type === TANK_TYPE.PLAYER || !this.alive) return { move: false, fire: false }

    this.aiChangeDirTimer++
    this.aiFireTimer++

    let shouldFire = false
    let newDirection = this.direction
    let shouldMove = true

    if (this.aiChangeDirTimer >= 60 + Math.random() * 60) {
      this.aiChangeDirTimer = 0
      const rand = Math.random()
      if (rand < 0.5 && player && player.alive) {
        const dx = player.x - this.x
        const dy = player.y - this.y
        if (Math.abs(dx) > Math.abs(dy)) {
          newDirection = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT
        } else {
          newDirection = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP
        }
      } else {
        newDirection = Math.floor(Math.random() * 4)
      }
    }

    if (this.aiFireTimer >= 50 + Math.random() * 80) {
      this.aiFireTimer = 0
      shouldFire = true
    }

    return {
      direction: newDirection,
      shouldMove,
      shouldFire
    }
  }

  render(ctx, offsetX, offsetY) {
    if (!this.alive) return

    const x = offsetX + this.x
    const y = offsetY + this.y
    const size = this.width

    ctx.save()
    ctx.translate(x + size / 2, y + size / 2)
    ctx.rotate(this.direction * Math.PI / 2)
    ctx.translate(-size / 2, -size / 2)

    ctx.fillStyle = this.trackColor
    ctx.fillRect(0, 2, size, 6)
    ctx.fillRect(0, size - 8, size, 6)

    ctx.fillStyle = this.color
    for (let i = 0; i < 5; i++) {
      const trackOffset = this.animFrame * 4
      ctx.fillRect(2 + i * 6 + trackOffset % 6, 3, 3, 4)
      ctx.fillRect(2 + i * 6 + trackOffset % 6, size - 7, 3, 4)
    }

    ctx.fillStyle = this.bodyColor
    ctx.fillRect(4, 6, size - 8, size - 12)

    ctx.fillStyle = this.turretColor
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = this.trackColor
    ctx.fillRect(size / 2 - 3, 0, 6, size / 2 + 2)

    if (this.type === TANK_TYPE.PLAYER) {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 8, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const hpRatio = this.hp / this.maxHp
      if (this.maxHp > 1) {
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(4, size - 10, (size - 8) * hpRatio, 3)
      }
    }

    ctx.restore()

    if (this.type === TANK_TYPE.PLAYER && this.shieldActive) {
      const pulse = Math.sin(Date.now() / 100) * 2
      ctx.save()
      ctx.strokeStyle = this.shieldTimer < 2000 ?
        (Math.floor(Date.now() / 100) % 2 === 0 ? 'rgba(96, 165, 250, 0.8)' : 'rgba(96, 165, 250, 0.3)') :
        'rgba(96, 165, 250, 0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 6 + pulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
}
