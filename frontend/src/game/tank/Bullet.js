import { DIRECTION, GAME_CONFIG, TILE } from './constants.js'

const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_CONFIG

export class Bullet {
  constructor(x, y, direction, speed, damage, owner, ownerRef, canBreakSteel = false) {
    this.x = x
    this.y = y
    this.direction = direction
    this.speed = speed
    this.damage = damage
    this.owner = owner
    this.ownerRef = ownerRef
    this.canBreakSteel = canBreakSteel
    this.width = 8
    this.height = 8
    this.active = true
  }

  update() {
    if (!this.active) return

    const dx = [0, 1, 0, -1][this.direction] * this.speed
    const dy = [-1, 0, 1, 0][this.direction] * this.speed

    this.x += dx
    this.y += dy

    const mapPixelWidth = MAP_COLS * TILE_SIZE
    const mapPixelHeight = MAP_ROWS * TILE_SIZE

    if (this.x < -this.width || this.x > mapPixelWidth ||
        this.y < -this.height || this.y > mapPixelHeight) {
      this.active = false
    }
  }

  checkMapCollision(mapManager) {
    if (!this.active) return null

    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    const col = Math.floor(centerX / TILE_SIZE)
    const row = Math.floor(centerY / TILE_SIZE)

    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
      this.active = false
      return { type: 'boundary' }
    }

    const tile = mapManager.getTile(col, row)

    if (tile === TILE.BRICK) {
      this.active = false
      const destroyed = mapManager.destroyTile(col, row)
      return { type: 'brick', col, row, destroyed }
    }

    if (tile === TILE.STEEL) {
      this.active = false
      if (this.canBreakSteel) {
        mapManager.setTile(col, row, TILE.EMPTY)
        return { type: 'steel_broken', col, row }
      }
      return { type: 'steel', col, row }
    }

    if (tile === TILE.BASE) {
      this.active = false
      mapManager.destroyTile(col, row)
      return { type: 'base', col, row }
    }

    return null
  }

  checkTankCollision(tanks) {
    if (!this.active) return null

    for (const tank of tanks) {
      if (!tank.alive) continue
      if (tank === this.ownerRef) continue

      if (this.owner === 'player' && tank.type === 'player') continue
      if (this.owner !== 'player' && tank.type !== 'player') continue

      if (this.x < tank.x + tank.width &&
          this.x + this.width > tank.x &&
          this.y < tank.y + tank.height &&
          this.y + this.height > tank.y) {
        this.active = false
        const killed = tank.takeDamage(this.damage)
        return { tank, killed }
      }
    }
    return null
  }

  checkBulletCollision(bullets) {
    if (!this.active) return null

    for (const bullet of bullets) {
      if (bullet === this || !bullet.active) continue
      if (bullet.owner === this.owner) continue

      if (this.x < bullet.x + bullet.width &&
          this.x + this.width > bullet.x &&
          this.y < bullet.y + bullet.height &&
          this.y + this.height > bullet.y) {
        this.active = false
        bullet.active = false
        return { bullet }
      }
    }
    return null
  }

  render(ctx, offsetX, offsetY) {
    if (!this.active) return

    const x = offsetX + this.x
    const y = offsetY + this.y

    ctx.save()

    const isPlayer = this.owner === 'player'
    const gradient = ctx.createRadialGradient(
      x + this.width / 2, y + this.height / 2, 0,
      x + this.width / 2, y + this.height / 2, this.width
    )

    if (isPlayer) {
      gradient.addColorStop(0, '#fff7ed')
      gradient.addColorStop(0.5, '#fbbf24')
      gradient.addColorStop(1, '#f59e0b')
      ctx.shadowColor = '#fbbf24'
    } else {
      gradient.addColorStop(0, '#fef2f2')
      gradient.addColorStop(0.5, '#ef4444')
      gradient.addColorStop(1, '#dc2626')
      ctx.shadowColor = '#ef4444'
    }
    ctx.shadowBlur = 8

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x + this.width / 2, y + this.height / 2, this.width / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
