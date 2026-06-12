<template>
  <div class="page-container game-snake" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">🐍 贪吃蛇</div>
      <button class="reset-btn" @click="resetGame">
        重置
      </button>
    </div>

    <div class="score-row">
      <div class="score-display">
        <div class="score-label">当前分数</div>
        <div class="score-value">{{ score }}</div>
      </div>
      <div class="score-display">
        <div class="score-label">最高分</div>
        <div class="score-value">{{ highScore }}</div>
      </div>
      <div class="score-display">
        <div class="score-label">长度</div>
        <div class="score-value">{{ snakeLength }}</div>
      </div>
    </div>

    <div class="game-canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="game-canvas"
      ></canvas>
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
        <button class="dir-btn" @touchstart.prevent="handleDirStart('up')" @touchend.prevent="handleDirEnd('up')">
          <el-icon :size="28"><ArrowUp /></el-icon>
        </button>
      </div>
      <div class="dir-row">
        <button class="dir-btn" @touchstart.prevent="handleDirStart('left')" @touchend.prevent="handleDirEnd('left')">
          <el-icon :size="28"><ArrowLeft /></el-icon>
        </button>
        <button class="dir-btn" @touchstart.prevent="handleDirStart('down')" @touchend.prevent="handleDirEnd('down')">
          <el-icon :size="28"><ArrowDown /></el-icon>
        </button>
        <button class="dir-btn" @touchstart.prevent="handleDirStart('right')" @touchend.prevent="handleDirEnd('right')">
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

const submitScore = inject('submitScore')
const highScores = inject('highScores')

const GRID_SIZE = 20
const INITIAL_SPEED = 150
const MIN_SPEED = 60

const canvasSize = ref(300)
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)
const snakeLength = computed(() => snake.length)

const highScore = computed(() => highScores['snake'] || 0)

let snake = []
let food = null
let direction = 'right'
let nextDirection = 'right'
let ctx = null
let cellSize = 0
let gameLoop = null
let swipeHandler = null
let currentSpeed = INITIAL_SPEED
let scoreSubmitted = false

function initGame() {
  const centerX = Math.floor(GRID_SIZE / 2)
  const centerY = Math.floor(GRID_SIZE / 2)
  snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ]
  direction = 'right'
  nextDirection = 'right'
  score.value = 0
  gameOver.value = false
  isRunning.value = false
  currentSpeed = INITIAL_SPEED
  scoreSubmitted = false
  generateFood()
  draw()
}

function generateFood() {
  let newFood
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    }
  } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y))
  food = newFood
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function draw() {
  if (!ctx) return

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  drawRoundedRect(0, 0, canvasSize.value, canvasSize.value, 12)
  ctx.fill()

  const padding = 2
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = j * cellSize + padding
      const y = i * cellSize + padding
      const size = cellSize - padding * 2
      ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'
      ctx.fillRect(x, y, size, size)
    }
  }

  if (food) {
    const fx = food.x * cellSize + padding
    const fy = food.y * cellSize + padding
    const fSize = cellSize - padding * 2
    const radius = fSize * 0.3

    ctx.save()
    ctx.shadowColor = '#ff6b6b'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#ff6b6b'
    drawRoundedRect(fx, fy, fSize, fSize, radius)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#fff'
    ctx.font = `bold ${fSize * 0.6}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🍎', fx + fSize / 2, fy + fSize / 2)
  }

  snake.forEach((segment, index) => {
    const sx = segment.x * cellSize + padding
    const sy = segment.y * cellSize + padding
    const sSize = cellSize - padding * 2
    const radius = sSize * 0.25

    const isHead = index === 0
    const progress = index / snake.length

    if (isHead) {
      ctx.save()
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 15
      const gradient = ctx.createRadialGradient(
        sx + sSize / 2, sy + sSize / 2, 0,
        sx + sSize / 2, sy + sSize / 2, sSize
      )
      gradient.addColorStop(0, '#00ff88')
      gradient.addColorStop(1, '#00cc6a')
      ctx.fillStyle = gradient
      drawRoundedRect(sx, sy, sSize, sSize, radius)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = '#fff'
      const eyeSize = sSize * 0.2
      const eyeOffset = sSize * 0.25

      let eye1X, eye1Y, eye2X, eye2Y
      switch (direction) {
        case 'up':
          eye1X = sx + eyeOffset
          eye1Y = sy + eyeOffset
          eye2X = sx + sSize - eyeOffset
          eye2Y = sy + eyeOffset
          break
        case 'down':
          eye1X = sx + eyeOffset
          eye1Y = sy + sSize - eyeOffset
          eye2X = sx + sSize - eyeOffset
          eye2Y = sy + sSize - eyeOffset
          break
        case 'left':
          eye1X = sx + eyeOffset
          eye1Y = sy + eyeOffset
          eye2X = sx + eyeOffset
          eye2Y = sy + sSize - eyeOffset
          break
        case 'right':
        default:
          eye1X = sx + sSize - eyeOffset
          eye1Y = sy + eyeOffset
          eye2X = sx + sSize - eyeOffset
          eye2Y = sy + sSize - eyeOffset
          break
      }

      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2)
      ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#000'
      const pupilSize = eyeSize * 0.5
      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, pupilSize, 0, Math.PI * 2)
      ctx.arc(eye2X, eye2Y, pupilSize, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const gradient = ctx.createLinearGradient(sx, sy, sx + sSize, sy + sSize)
      const greenValue = Math.floor(255 - progress * 100)
      gradient.addColorStop(0, `rgb(0, ${greenValue}, ${Math.floor(136 - progress * 50)})`)
      gradient.addColorStop(1, `rgb(0, ${Math.floor(200 - progress * 80)}, ${Math.floor(106 - progress * 40)})`)
      ctx.fillStyle = gradient
      drawRoundedRect(sx, sy, sSize, sSize, radius * 0.8)
      ctx.fill()
    }
  })

  if (gameOver.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    drawRoundedRect(0, 0, canvasSize.value, canvasSize.value, 12)
    ctx.fill()
  }
}

function moveSnake() {
  direction = nextDirection
  const head = { ...snake[0] }

  switch (direction) {
    case 'up':
      head.y -= 1
      break
    case 'down':
      head.y += 1
      break
    case 'left':
      head.x -= 1
      break
    case 'right':
      head.x += 1
      break
  }

  if (checkCollision(head)) {
    gameOver.value = true
    isRunning.value = false
    stopGameLoop()
    handleGameOver()
    return
  }

  snake.unshift(head)

  if (head.x === food.x && head.y === food.y) {
    score.value += 10
    generateFood()
    if (currentSpeed > MIN_SPEED) {
      currentSpeed -= 2
    }
    stopGameLoop()
    startGameLoop()
  } else {
    snake.pop()
  }

  draw()
}

function checkCollision(head) {
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true
  }

  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true
    }
  }

  return false
}

function changeDirection(newDir) {
  const opposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  }

  if (opposites[newDir] !== direction) {
    nextDirection = newDir
  }
}

function handleDirStart(dir) {
  changeDirection(dir)
}

function handleDirEnd(dir) {
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

function startGameLoop() {
  stopGameLoop()
  gameLoop = setInterval(moveSnake, currentSpeed)
}

function stopGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('snake', score.value)
  }
}

function goBack() {
  stopGameLoop()
  router.push({ path: '/home' })
}

function handleKeydown(e) {
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'w': 'up',
    's': 'down',
    'a': 'left',
    'd': 'right',
    'W': 'up',
    'S': 'down',
    'A': 'left',
    'D': 'right'
  }

  if (keyMap[e.key]) {
    e.preventDefault()
    changeDirection(keyMap[e.key])
  }

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    toggleGame()
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    resetGame()
  }
}

function resizeCanvas() {
  const screenWidth = Math.min(window.innerWidth - 40, 400)
  canvasSize.value = screenWidth
  cellSize = canvasSize.value / GRID_SIZE
  if (canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    canvasRef.value.width = canvasSize.value * dpr
    canvasRef.value.height = canvasSize.value * dpr
    canvasRef.value.style.width = canvasSize.value + 'px'
    canvasRef.value.style.height = canvasSize.value + 'px'
    ctx = canvasRef.value.getContext('2d')
    ctx.scale(dpr, dpr)
  }
}

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    initGame()
  })

  swipeHandler = useSwipe(pageRef.value, {
    onSwipeUp: () => changeDirection('up'),
    onSwipeDown: () => changeDirection('down'),
    onSwipeLeft: () => changeDirection('left'),
    onSwipeRight: () => changeDirection('right'),
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
  if (swipeHandler) {
    swipeHandler.unbind()
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-snake {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

.score-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 20px;
}

.score-row .score-display {
  min-width: 90px;
  padding: 12px 16px;
}

.score-row .score-value {
  font-size: 24px;
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
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
}

.dir-row {
  display: flex;
  gap: 10px;
}

.dir-btn {
  width: 68px;
  height: 68px;
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
}

.dir-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.4);
}
</style>
