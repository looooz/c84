import { POWERUP_TYPE, GAME_CONFIG } from './constants.js'

const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_CONFIG

export class Powerup {
  constructor(type, x, y) {
    this.type = type
    this.x = x
    this.y = y
    this.width = TILE_SIZE - 4
    this.height = TILE_SIZE - 4
    this.active = true
    this.spawnTime = Date.now()
    this.duration = 15000
    this.pulse = 0
    this.blink = false
  }

  update() {
    if (!this.active) return
    this.pulse += 0.1

    const elapsed = Date.now() - this.spawnTime
    if (elapsed > this.duration - 3000) {
      this.blink = Math.floor(elapsed / 200) % 2 === 0
    }
    if (elapsed > this.duration) {
      this.active = false
    }
  }

  checkCollision(tank) {
    if (!this.active || !tank.alive) return false
    return this.x < tank.x + tank.width &&
           this.x + this.width > tank.x &&
           this.y < tank.y + tank.height &&
           this.y + this.height > tank.y
  }

  getInfo() {
    const info = {
      [POWERUP_TYPE.STAR]: { icon: '⭐', color: '#fbbf24', name: '升级' },
      [POWERUP_TYPE.SHIELD]: { icon: '🛡️', color: '#3b82f6', name: '护盾' },
      [POWERUP_TYPE.BOMB]: { icon: '💣', color: '#ef4444', name: '炸弹' },
      [POWERUP_TYPE.LIFE]: { icon: '❤️', color: '#ec4899', name: '生命' },
      [POWERUP_TYPE.SHOVEL]: { icon: '🔨', color: '#22c55e', name: '修复' },
      [POWERUP_TYPE.CLOCK]: { icon: '⏰', color: '#8b5cf6', name: '冻结' }
    }
    return info[this.type] || info[POWERUP_TYPE.STAR]
  }

  render(ctx, offsetX, offsetY) {
    if (!this.active) return
    if (this.blink) return

    const info = this.getInfo()
    const scale = 1 + Math.sin(this.pulse) * 0.1
    const x = offsetX + this.x + this.width / 2
    const y = offsetY + this.y + this.height / 2
    const size = this.width * scale / 2

    ctx.save()
    ctx.shadowColor = info.color
    ctx.shadowBlur = 12

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size + 4)
    gradient.addColorStop(0, '#fff')
    gradient.addColorStop(0.3, info.color)
    gradient.addColorStop(1, info.color)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x - size, y - size, size * 2, size * 2, 6)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.font = `bold ${this.width * 0.6}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(info.icon, x, y + 1)

    ctx.restore()
  }
}

export function createRandomPowerup(mapManager = null) {
  const types = Object.values(POWERUP_TYPE)
  const type = types[Math.floor(Math.random() * types.length)]

  const padding = TILE_SIZE * 2
  const mapW = MAP_COLS * TILE_SIZE
  const mapH = MAP_ROWS * TILE_SIZE
  const powerupSize = TILE_SIZE - 4

  let x, y
  let attempts = 0
  const maxAttempts = 50

  do {
    x = padding + Math.random() * (mapW - padding * 2 - TILE_SIZE)
    y = padding + Math.random() * (mapH - padding * 2 - TILE_SIZE)
    attempts++
  } while (
    attempts < maxAttempts &&
    mapManager &&
    mapManager.checkCollision(x, y, powerupSize, powerupSize)
  )

  return new Powerup(type, x, y)
}
