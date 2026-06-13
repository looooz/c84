<template>
  <div class="page-container game-tetris" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">🧱 俄罗斯方块</div>
      <button class="reset-btn" @click="resetGame">
        重置
      </button>
    </div>

    <div class="game-body">
      <div class="score-column">
        <div class="score-display">
          <div class="score-label">当前分数</div>
          <div class="score-value">{{ score }}</div>
        </div>
        <div class="score-display">
          <div class="score-label">最高分</div>
          <div class="score-value">{{ highScore }}</div>
        </div>
        <div class="score-display">
          <div class="score-label">等级</div>
          <div class="score-value">{{ level }}</div>
        </div>
        <div class="score-display">
          <div class="score-label">消除行数</div>
          <div class="score-value">{{ lines }}</div>
        </div>
        <div class="next-piece-box">
          <div class="score-label">下一个</div>
          <canvas ref="nextCanvasRef" class="next-canvas"></canvas>
        </div>
      </div>

      <div class="canvas-column">
        <div class="game-canvas-wrapper">
          <canvas ref="canvasRef" class="game-canvas"></canvas>
        </div>
      </div>
    </div>

    <div class="game-status" v-if="gameOver">
      <div class="status-text">游戏结束！</div>
      <div class="status-score">最终得分: {{ score }}</div>
    </div>

    <div class="control-panel">
      <button
        class="control-btn start-btn"
        @click="toggleGame"
        :class="{ pause: isRunning && !gameOver }"
      >
        <el-icon :size="20">
          <component :is="isRunning && !gameOver ? 'Pause' : 'VideoPlay'" />
        </el-icon>
        <span>{{ isRunning && !gameOver ? '暂停' : '开始' }}</span>
      </button>
    </div>

    <div class="direction-buttons">
      <div class="dir-row">
        <button class="dir-btn" @click="rotatePiece" @touchstart.prevent="onTouchRotate">
          <el-icon :size="28"><RefreshRight /></el-icon>
        </button>
        <button class="dir-btn" @click="hardDrop" @touchstart.prevent="onTouchHardDrop">
          <el-icon :size="28"><CaretTop /></el-icon>
        </button>
      </div>
      <div class="dir-row">
        <button class="dir-btn" @click="moveLeft" @touchstart.prevent="onTouchLeft" @touchend.prevent="onTouchEnd">
          <el-icon :size="28"><ArrowLeft /></el-icon>
        </button>
        <button class="dir-btn" @click="softDrop" @touchstart.prevent="onTouchSoftDrop" @touchend.prevent="onTouchEnd">
          <el-icon :size="28"><ArrowDown /></el-icon>
        </button>
        <button class="dir-btn" @click="moveRight" @touchstart.prevent="onTouchRight" @touchend.prevent="onTouchEnd">
          <el-icon :size="28"><ArrowRight /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe } from '../utils/touch'

const router = useRouter()
const pageRef = ref(null)
const canvasRef = ref(null)
const nextCanvasRef = ref(null)

const submitScore = inject('submitScore')
const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const COLS = 10
const ROWS = 20
const INITIAL_SPEED = 800
const MIN_SPEED = 100

const canvasSize = ref({ w: 260, h: 520 })
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)
const level = ref(1)
const lines = ref(0)

const highScore = computed(() => highScores['tetris'] || 0)

const SHAPES = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f5ff'
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: '#ffd700'
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1]],
    color: '#a855f7'
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0]],
    color: '#22c55e'
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1]],
    color: '#ef4444'
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1]],
    color: '#3b82f6'
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1]],
    color: '#f97316'
  }
}

const PIECE_KEYS = Object.keys(SHAPES)

let board = []
let currentPiece = null
let nextPiece = null
let ctx = null
let nextCtx = null
let cellSize = 0
let nextCellSize = 0
let gameLoop = null
let swipeHandler = null
let currentSpeed = INITIAL_SPEED
let scoreSubmitted = false
let holdTimer = null
let holdDir = null

function createBoard() {
  board = []
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(null))
  }
}

function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  const def = SHAPES[key]
  return {
    shape: def.shape.map(row => [...row]),
    color: def.color,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0
  }
}

function rotateMatrix(matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  const rotated = []
  for (let c = 0; c < cols; c++) {
    const newRow = []
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c])
    }
    rotated.push(newRow)
  }
  return rotated
}

function isValid(piece, offsetX = 0, offsetY = 0, shape = null) {
  const testShape = shape || piece.shape
  for (let r = 0; r < testShape.length; r++) {
    for (let c = 0; c < testShape[r].length; c++) {
      if (!testShape[r][c]) continue
      const nx = piece.x + c + offsetX
      const ny = piece.y + r + offsetY
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false
      if (ny >= 0 && board[ny][nx]) return false
    }
  }
  return true
}

function mergePiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        const ny = currentPiece.y + r
        const nx = currentPiece.x + c
        if (ny >= 0) {
          board[ny][nx] = currentPiece.color
        }
      }
    }
  }
}

function clearLines() {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1)
      board.unshift(new Array(COLS).fill(null))
      cleared++
      r++
    }
  }
  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800]
    score.value += points[cleared] * level.value
    lines.value += cleared
    const newLevel = Math.floor(lines.value / 10) + 1
    if (newLevel !== level.value) {
      level.value = newLevel
      currentSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (level.value - 1) * 80)
      if (isRunning.value) {
        stopGameLoop()
        startGameLoop()
      }
    }
  }
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawCell(context, x, y, size, color, radius) {
  const r = radius || size * 0.2
  const padding = 1
  const innerSize = size - padding * 2
  context.save()
  context.shadowColor = color
  context.shadowBlur = 6
  const gradient = context.createLinearGradient(x + padding, y + padding, x + size - padding, y + size - padding)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, shadeColor(color, -20))
  context.fillStyle = gradient
  context.beginPath()
  context.moveTo(x + padding + r, y + padding)
  context.lineTo(x + padding + innerSize - r, y + padding)
  context.quadraticCurveTo(x + padding + innerSize, y + padding, x + padding + innerSize, y + padding + r)
  context.lineTo(x + padding + innerSize, y + padding + innerSize - r)
  context.quadraticCurveTo(x + padding + innerSize, y + padding + innerSize, x + padding + innerSize - r, y + padding + innerSize)
  context.lineTo(x + padding + r, y + padding + innerSize)
  context.quadraticCurveTo(x + padding, y + padding + innerSize, x + padding, y + padding + innerSize - r)
  context.lineTo(x + padding, y + padding + r)
  context.quadraticCurveTo(x + padding, y + padding, x + padding + r, y + padding)
  context.closePath()
  context.fill()
  context.restore()

  context.fillStyle = 'rgba(255,255,255,0.25)'
  context.fillRect(x + padding + 2, y + padding + 2, (innerSize - 4) * 0.4, 2)
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1)
}

function drawGhostPiece() {
  if (!currentPiece) return
  let ghostY = 0
  while (isValid(currentPiece, 0, ghostY + 1)) {
    ghostY++
  }
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        const x = (currentPiece.x + c) * cellSize
        const y = (currentPiece.y + r + ghostY) * cellSize
        ctx.save()
        ctx.globalAlpha = 0.25
        ctx.strokeStyle = currentPiece.color
        ctx.lineWidth = 2
        drawRoundedRect(x + 2, y + 2, cellSize - 4, cellSize - 4, cellSize * 0.2)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
}

function draw() {
  if (!ctx) return

  ctx.clearRect(0, 0, canvasSize.value.w, canvasSize.value.h)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  drawRoundedRect(0, 0, canvasSize.value.w, canvasSize.value.h, 12)
  ctx.fill()

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * cellSize
      const y = r * cellSize
      ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
      ctx.fillRect(x, y, cellSize, cellSize)
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawCell(ctx, c * cellSize, r * cellSize, cellSize, board[r][c])
      }
    }
  }

  if (currentPiece && !gameOver.value) {
    drawGhostPiece()
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const x = (currentPiece.x + c) * cellSize
          const y = (currentPiece.y + r) * cellSize
          if (y >= 0) {
            drawCell(ctx, x, y, cellSize, currentPiece.color)
          }
        }
      }
    }
  }

  if (gameOver.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    drawRoundedRect(0, 0, canvasSize.value.w, canvasSize.value.h, 12)
    ctx.fill()
  }

  drawNextPiece()
}

function drawNextPiece() {
  if (!nextCtx || !nextPiece) return
  const size = 100
  nextCtx.clearRect(0, 0, size, size)
  nextCtx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  nextCtx.beginPath()
  nextCtx.roundRect(0, 0, size, size, 10)
  nextCtx.fill()

  const shape = nextPiece.shape
  const pieceW = shape[0].length * nextCellSize
  const pieceH = shape.length * nextCellSize
  const offsetX = (size - pieceW) / 2
  const offsetY = (size - pieceH) / 2

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        drawCell(nextCtx, offsetX + c * nextCellSize, offsetY + r * nextCellSize, nextCellSize, nextPiece.color)
      }
    }
  }
}

function spawnPiece() {
  currentPiece = nextPiece || randomPiece()
  nextPiece = randomPiece()
  if (!isValid(currentPiece)) {
    gameOver.value = true
    isRunning.value = false
    stopGameLoop()
    handleGameOver()
  }
}

function moveLeft() {
  if (currentPiece && isValid(currentPiece, -1, 0)) {
    currentPiece.x--
    draw()
  }
}

function moveRight() {
  if (currentPiece && isValid(currentPiece, 1, 0)) {
    currentPiece.x++
    draw()
  }
}

function rotatePiece() {
  if (!currentPiece) return
  const rotated = rotateMatrix(currentPiece.shape)
  const kicks = [0, -1, 1, -2, 2]
  for (const kick of kicks) {
    if (isValid(currentPiece, kick, 0, rotated)) {
      currentPiece.shape = rotated
      currentPiece.x += kick
      draw()
      return
    }
  }
}

function softDrop() {
  if (currentPiece && isValid(currentPiece, 0, 1)) {
    currentPiece.y++
    score.value += 1
    draw()
  } else {
    lockPiece()
  }
}

function hardDrop() {
  if (!currentPiece) return
  let dropped = 0
  while (isValid(currentPiece, 0, 1)) {
    currentPiece.y++
    dropped++
  }
  score.value += dropped * 2
  lockPiece()
}

function lockPiece() {
  mergePiece()
  clearLines()
  spawnPiece()
  draw()
}

function tick() {
  if (currentPiece && isValid(currentPiece, 0, 1)) {
    currentPiece.y++
    draw()
  } else {
    lockPiece()
  }
}

function startGameLoop() {
  stopGameLoop()
  gameLoop = setInterval(tick, currentSpeed)
}

function stopGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

function initGame() {
  createBoard()
  score.value = 0
  lines.value = 0
  level.value = 1
  currentSpeed = INITIAL_SPEED
  gameOver.value = false
  isRunning.value = false
  scoreSubmitted = false
  nextPiece = randomPiece()
  spawnPiece()
  draw()
}

function toggleGame() {
  if (gameOver.value) {
    resetGame()
    return
  }
  if (isRunning.value) {
    pauseGame()
  } else {
    startGame()
  }
}

function startGame() {
  if (gameOver.value) {
    initGame()
  }
  isRunning.value = true
  startGameLoop()
}

function pauseGame() {
  isRunning.value = false
  stopGameLoop()
}

function resetGame() {
  stopGameLoop()
  initGame()
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('tetris', score.value)
  }
}

function goBack() {
  stopGameLoop()
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    submitScore('tetris', score.value)
  }
  router.push({ path: '/home' })
}

function handleKeydown(e) {
  const key = e.key
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'r', 'R'].includes(key)) {
    e.preventDefault()
  }
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') moveLeft()
  else if (key === 'ArrowRight' || key === 'd' || key === 'D') moveRight()
  else if (key === 'ArrowDown' || key === 's' || key === 'S') softDrop()
  else if (key === 'ArrowUp' || key === 'w' || key === 'W') rotatePiece()
  else if (key === ' ') hardDrop()
  else if (key === 'Enter') toggleGame()
  else if (key === 'r' || key === 'R') resetGame()
}

function startHold(dir) {
  stopHold()
  holdDir = dir
  holdTimer = setInterval(() => {
    if (holdDir === 'left') moveLeft()
    else if (holdDir === 'right') moveRight()
    else if (holdDir === 'down') softDrop()
  }, 80)
}

function stopHold() {
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  holdDir = null
}

function onTouchLeft() { moveLeft(); startHold('left') }
function onTouchRight() { moveRight(); startHold('right') }
function onTouchSoftDrop() { softDrop(); startHold('down') }
function onTouchEnd() { stopHold() }
function onTouchRotate() { rotatePiece() }
function onTouchHardDrop() { hardDrop() }

function resizeCanvas() {
  const screenWidth = Math.min(window.innerWidth, 500)
  const availableWidth = screenWidth - 40
  const gameW = Math.min(availableWidth * 0.62, 260)
  const gameH = gameW * 2
  canvasSize.value = { w: gameW, h: gameH }
  cellSize = gameW / COLS

  if (canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    canvasRef.value.width = gameW * dpr
    canvasRef.value.height = gameH * dpr
    canvasRef.value.style.width = gameW + 'px'
    canvasRef.value.style.height = gameH + 'px'
    ctx = canvasRef.value.getContext('2d')
    ctx.scale(dpr, dpr)
  }

  const nextSize = 100
  nextCellSize = 22
  if (nextCanvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    nextCanvasRef.value.width = nextSize * dpr
    nextCanvasRef.value.height = nextSize * dpr
    nextCanvasRef.value.style.width = nextSize + 'px'
    nextCanvasRef.value.style.height = nextSize + 'px'
    nextCtx = nextCanvasRef.value.getContext('2d')
    nextCtx.scale(dpr, dpr)
  }
}

onMounted(() => {
  loadHighScores()
  nextTick(() => {
    resizeCanvas()
    initGame()
  })

  swipeHandler = useSwipe(pageRef.value, {
    onSwipeLeft: () => moveLeft(),
    onSwipeRight: () => moveRight(),
    onSwipeDown: () => hardDrop(),
    onSwipeUp: () => rotatePiece(),
    threshold: 30,
    preventDefault: true
  })
  swipeHandler.bind()

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', () => {
    nextTick(() => {
      resizeCanvas()
      draw()
    })
  })
})

onUnmounted(() => {
  stopGameLoop()
  stopHold()
  if (swipeHandler) {
    swipeHandler.unbind()
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-tetris {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
}

.game-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.back-btn:active,
.reset-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.3);
}

.game-title {
  font-size: 24px;
  font-weight: 800;
  color: white;
}

.reset-btn {
  padding: 10px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.game-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: center;
  padding: 0 12px;
  width: 100%;
}

.score-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-column .score-display {
  padding: 8px 12px;
  min-width: 80px;
}

.score-column .score-value {
  font-size: 20px;
}

.next-piece-box {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 10px 12px;
  color: white;
  text-align: center;
}

.next-canvas {
  display: block;
  margin-top: 6px;
  border-radius: 10px;
}

.canvas-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-canvas-wrapper {
  padding: 0;
}

.game-status {
  margin-top: 12px;
  text-align: center;
  color: white;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 6px;
}

.status-score {
  font-size: 16px;
  opacity: 0.9;
}

.control-panel {
  margin-top: 16px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 40px;
  border-radius: 30px;
  border: none;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.start-btn.pause {
  background: linear-gradient(135deg, #ffa751 0%, #ffe259 100%);
  box-shadow: 0 4px 15px rgba(255, 167, 81, 0.4);
}

.start-btn:active {
  transform: scale(0.95);
}

.direction-buttons {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
  padding-left: 20px;
  padding-right: 20px;
}

.dir-row {
  display: flex;
  gap: 18px;
}

.dir-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.1s ease;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dir-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.4);
}

@media (min-width: 600px) {
  .score-column {
    gap: 12px;
  }
  .score-column .score-display {
    padding: 14px 20px;
    min-width: 100px;
  }
  .score-column .score-value {
    font-size: 24px;
  }
}
</style>
