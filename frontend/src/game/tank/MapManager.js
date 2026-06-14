import { TILE, GAME_CONFIG } from './constants.js'

const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_CONFIG

export class MapManager {
  constructor() {
    this.map = []
    this.basePosition = { col: 6, row: 12 }
  }

  init(level = 1) {
    this.map = []
    for (let r = 0; r < MAP_ROWS; r++) {
      this.map[r] = []
      for (let c = 0; c < MAP_COLS; c++) {
        this.map[r][c] = TILE.EMPTY
      }
    }
    this.generateLevel(level)
    this.placeBase()
  }

  generateLevel(level) {
    const patterns = this.getLevelPattern(level)
    for (const block of patterns) {
      this.placeBlock(block.type, block.startCol, block.startRow, block.width, block.height)
    }
  }

  getLevelPattern(level) {
    const basePatterns = [
      { type: TILE.BRICK, startCol: 2, startRow: 2, width: 2, height: 2 },
      { type: TILE.BRICK, startCol: 9, startRow: 2, width: 2, height: 2 },
      { type: TILE.BRICK, startCol: 0, startRow: 5, width: 2, height: 2 },
      { type: TILE.BRICK, startCol: 11, startRow: 5, width: 2, height: 2 },
      { type: TILE.STEEL, startCol: 6, startRow: 4, width: 1, height: 1 },
      { type: TILE.BRICK, startCol: 3, startRow: 7, width: 2, height: 2 },
      { type: TILE.BRICK, startCol: 8, startRow: 7, width: 2, height: 2 },
      { type: TILE.GRASS, startCol: 5, startRow: 7, width: 3, height: 1 },
      { type: TILE.BRICK, startCol: 4, startRow: 10, width: 1, height: 2 },
      { type: TILE.BRICK, startCol: 8, startRow: 10, width: 1, height: 2 },
      { type: TILE.WATER, startCol: 1, startRow: 9, width: 2, height: 1 }
    ]

    if (level >= 2) {
      basePatterns.push(
        { type: TILE.STEEL, startCol: 0, startRow: 0, width: 1, height: 1 },
        { type: TILE.STEEL, startCol: 12, startRow: 0, width: 1, height: 1 },
        { type: TILE.GRASS, startCol: 2, startRow: 8, width: 1, height: 2 },
        { type: TILE.GRASS, startCol: 10, startRow: 8, width: 1, height: 2 }
      )
    }
    if (level >= 3) {
      basePatterns.push(
        { type: TILE.WATER, startCol: 6, startRow: 1, width: 1, height: 1 },
        { type: TILE.STEEL, startCol: 3, startRow: 4, width: 1, height: 1 },
        { type: TILE.STEEL, startCol: 9, startRow: 4, width: 1, height: 1 }
      )
    }
    return basePatterns
  }

  placeBlock(type, startCol, startRow, width, height) {
    for (let r = startRow; r < Math.min(startRow + height, MAP_ROWS); r++) {
      for (let c = startCol; c < Math.min(startCol + width, MAP_COLS); c++) {
        if (r >= 0 && c >= 0 && r < MAP_ROWS && c < MAP_COLS) {
          this.map[r][c] = type
        }
      }
    }
  }

  placeBase() {
    const { col, row } = this.basePosition
    this.map[row][col] = TILE.BASE
    const protectPositions = [
      [col - 1, row - 1], [col, row - 1], [col + 1, row - 1],
      [col - 1, row], [col + 1, row]
    ]
    for (const [c, r] of protectPositions) {
      if (r >= 0 && c >= 0 && r < MAP_ROWS && c < MAP_COLS) {
        if (this.map[r][c] === TILE.EMPTY) {
          this.map[r][c] = TILE.BRICK
        }
      }
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return TILE.STEEL
    return this.map[row][col]
  }

  setTile(col, row, type) {
    if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
      this.map[row][col] = type
    }
  }

  destroyTile(col, row) {
    const tile = this.getTile(col, row)
    if (tile === TILE.BRICK) {
      this.setTile(col, row, TILE.EMPTY)
      return true
    }
    if (tile === TILE.BASE) {
      this.setTile(col, row, TILE.BASE_DESTROYED)
      return 'base'
    }
    return false
  }

  reinforceBase() {
    const { col, row } = this.basePosition
    const protectPositions = [
      [col - 1, row - 1], [col, row - 1], [col + 1, row - 1],
      [col - 1, row], [col + 1, row]
    ]
    for (const [c, r] of protectPositions) {
      if (r >= 0 && c >= 0 && r < MAP_ROWS && c < MAP_COLS) {
        this.map[r][c] = TILE.STEEL
      }
    }
  }

  checkCollision(x, y, width, height) {
    const left = Math.floor(x / TILE_SIZE)
    const right = Math.floor((x + width - 1) / TILE_SIZE)
    const top = Math.floor(y / TILE_SIZE)
    const bottom = Math.floor((y + height - 1) / TILE_SIZE)

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const tile = this.getTile(c, r)
        if (tile === TILE.BRICK || tile === TILE.STEEL ||
            tile === TILE.WATER || tile === TILE.BASE) {
          return true
        }
      }
    }
    return false
  }

  render(ctx, canvasWidth, canvasHeight) {
    const offsetX = (canvasWidth - MAP_COLS * TILE_SIZE) / 2
    const offsetY = (canvasHeight - MAP_ROWS * TILE_SIZE) / 2

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = this.map[r][c]
        const x = offsetX + c * TILE_SIZE
        const y = offsetY + r * TILE_SIZE
        this.renderTile(ctx, tile, x, y)
      }
    }

    return { offsetX, offsetY }
  }

  renderGrass(ctx, canvasWidth, canvasHeight) {
    const offsetX = (canvasWidth - MAP_COLS * TILE_SIZE) / 2
    const offsetY = (canvasHeight - MAP_ROWS * TILE_SIZE) / 2

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (this.map[r][c] === TILE.GRASS) {
          const x = offsetX + c * TILE_SIZE
          const y = offsetY + r * TILE_SIZE
          this.renderGrassTile(ctx, x, y)
        }
      }
    }
  }

  renderTile(ctx, tile, x, y) {
    switch (tile) {
      case TILE.BRICK:
        this.renderBrick(ctx, x, y)
        break
      case TILE.STEEL:
        this.renderSteel(ctx, x, y)
        break
      case TILE.WATER:
        this.renderWater(ctx, x, y)
        break
      case TILE.BASE:
        this.renderBase(ctx, x, y, false)
        break
      case TILE.BASE_DESTROYED:
        this.renderBase(ctx, x, y, true)
        break
    }
  }

  renderBrick(ctx, x, y) {
    const size = TILE_SIZE
    const half = size / 2
    ctx.fillStyle = '#b45309'
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(x, y, half - 1, half - 1)
    ctx.fillRect(x + half, y + half, half - 1, half - 1)
    ctx.fillStyle = '#d97706'
    ctx.fillRect(x + half, y, half - 1, half - 1)
    ctx.fillRect(x, y + half, half - 1, half - 1)
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
    ctx.beginPath()
    ctx.moveTo(x, y + half)
    ctx.lineTo(x + size, y + half)
    ctx.moveTo(x + half, y)
    ctx.lineTo(x + half, y + half)
    ctx.moveTo(x + half, y + half)
    ctx.lineTo(x + half, y + size)
    ctx.stroke()
  }

  renderSteel(ctx, x, y) {
    const size = TILE_SIZE
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
    gradient.addColorStop(0, '#e5e7eb')
    gradient.addColorStop(0.5, '#9ca3af')
    gradient.addColorStop(1, '#6b7280')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(x + 4, y + 4, 8, 4)
  }

  renderWater(ctx, x, y) {
    const size = TILE_SIZE
    const gradient = ctx.createLinearGradient(x, y, x, y + size)
    gradient.addColorStop(0, '#3b82f6')
    gradient.addColorStop(1, '#1e40af')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    const time = Date.now() / 500
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const waveY = y + 8 + i * 10 + Math.sin(time + i) * 2
      ctx.moveTo(x + 2, waveY)
      ctx.quadraticCurveTo(x + size / 2, waveY + 3, x + size - 2, waveY)
    }
    ctx.stroke()
  }

  renderGrassTile(ctx, x, y) {
    const size = TILE_SIZE
    ctx.fillStyle = 'rgba(34, 197, 94, 0.85)'
    for (let i = 0; i < 8; i++) {
      const gx = x + Math.random() * size
      const gy = y + Math.random() * size
      ctx.beginPath()
      ctx.moveTo(gx, gy + 8)
      ctx.lineTo(gx - 2, gy)
      ctx.lineTo(gx + 2, gy)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(22, 163, 74, 0.6)'
    ctx.fillRect(x, y, size, size)
  }

  renderBase(ctx, x, y, destroyed) {
    const size = TILE_SIZE
    if (destroyed) {
      ctx.fillStyle = '#374151'
      ctx.fillRect(x + 4, y + 8, size - 8, size - 12)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(x + 6, y + 12, 4, 4)
      ctx.fillRect(x + size - 10, y + 16, 4, 4)
    } else {
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(x + 4, y + 4, size - 8, size - 8)
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(x + 8, y + 8, size - 16, size - 16)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(x + size / 2, y + 6)
      ctx.lineTo(x + size / 2 + 6, y + size / 2)
      ctx.lineTo(x + size / 2, y + size - 6)
      ctx.lineTo(x + size / 2 - 6, y + size / 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#92400e'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 3, y + 3, size - 6, size - 6)
    }
  }
}
