<template>
  <div class="page-container game-bigfish" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">🐟 大鱼吃小鱼</div>
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
        <div class="score-label">体型</div>
        <div class="score-value">{{ fishSizeLevel }}</div>
      </div>
    </div>

    <div class="game-canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="game-canvas bigfish-canvas"
        @mousemove="handleMouseMove"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="handleTouchEnd"
      ></canvas>
    </div>

    <div class="game-status" v-if="gameOver">
      <div class="status-text">游戏结束！</div>
      <div class="status-score">最终得分: {{ score }}</div>
    </div>

    <div class="game-status" v-if="!gameOver && !isRunning">
      <div class="status-text" v-if="score === 0">点击开始游戏</div>
      <div class="status-text" v-else>游戏已暂停</div>
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
        <span>{{ isRunning && !gameOver ? '暂停' : (gameOver ? '重新开始' : '开始') }}</span>
      </button>
    </div>

    <div class="tips">
      <div class="tip-text">🎯 吃掉比你小的鱼来成长，避开比你大的鱼！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const pageRef = ref(null)
const canvasRef = ref(null)

const submitScore = inject('submitScore')
const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const BASE_PLAYER_SIZE = 28
const MAX_SIZE_LEVEL = 10
const INITIAL_SPAWN_INTERVAL = 1200
const MIN_SPAWN_INTERVAL = 400

const canvasSize = ref({ w: 360, h: 500 })
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)

const highScore = computed(() => highScores['bigfish'] || 0)
const fishSizeLevel = computed(() => {
  return Math.min(MAX_SIZE_LEVEL, Math.floor(player.size / BASE_PLAYER_SIZE) + 1)
})

let ctx = null
let animationFrame = null
let spawnTimer = null
let lastTime = 0
let spawnInterval = INITIAL_SPAWN_INTERVAL
let scoreSubmitted = false

const player = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  size: BASE_PLAYER_SIZE,
  speed: 6,
  facing: 1,
  color: '#ffd700'
}

let fishes = []
let bubbles = []

const FISH_COLORS = [
  ['#ff6b6b', '#ee5253'],
  ['#4ecdc4', '#44a08d'],
  ['#a29bfe', '#6c5ce7'],
  ['#fd79a8', '#e84393'],
  ['#00b894', '#00a085'],
  ['#fdcb6e', '#f39c12'],
  ['#e17055', '#d63031'],
  ['#74b9ff', '#0984e3']
]

function randRange(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(randRange(min, max + 1))
}

function createFish() {
  const side = Math.random() < 0.5 ? 'left' : 'right'
  const minSize = Math.max(12, player.size * 0.3)
  const maxSize = Math.min(70, player.size * 1.8)
  const size = randRange(minSize, maxSize)
  const colors = FISH_COLORS[randInt(0, FISH_COLORS.length - 1)]
  const baseSpeed = randRange(1.2, 3.2)
  const sizeFactor = 1 - (size - minSize) / (maxSize - minSize) * 0.5
  const speed = baseSpeed * sizeFactor

  return {
    x: side === 'left' ? -size * 2 : canvasSize.value.w + size * 2,
    y: randRange(size * 2, canvasSize.value.h - size * 2),
    size: size,
    speed: speed * (side === 'left' ? 1 : -1),
    facing: side === 'left' ? 1 : -1,
    color1: colors[0],
    color2: colors[1],
    tailPhase: Math.random() * Math.PI * 2,
    eaten: false
  }
}

function createBubble(x, y) {
  return {
    x: x + randRange(-10, 10),
    y: y,
    size: randRange(2, 6),
    speed: randRange(0.5, 1.5),
    alpha: randRange(0.3, 0.7),
    life: 1
  }
}

function drawFish(context, x, y, size, facing, color1, color2, tailPhase, isPlayer = false) {
  const s = size
  const tailOffset = Math.sin(tailPhase) * s * 0.2

  context.save()
  context.translate(x, y)
  context.scale(facing, 1)

  if (isPlayer) {
    context.shadowColor = '#ffd700'
    context.shadowBlur = 15
  }

  const bodyGradient = context.createRadialGradient(0, -s * 0.1, s * 0.2, 0, 0, s)
  bodyGradient.addColorStop(0, color1)
  bodyGradient.addColorStop(1, color2)
  context.fillStyle = bodyGradient

  context.beginPath()
  context.ellipse(0, 0, s * 0.9, s * 0.6, 0, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = color2
  context.beginPath()
  context.moveTo(-s * 0.85, 0)
  context.lineTo(-s * 1.5, -s * 0.5 + tailOffset)
  context.lineTo(-s * 1.3, 0)
  context.lineTo(-s * 1.5, s * 0.5 + tailOffset)
  context.closePath()
  context.fill()

  context.fillStyle = color1
  context.beginPath()
  context.ellipse(s * 0.3, -s * 0.55, s * 0.25, s * 0.15, -0.4, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(s * 0.45, -s * 0.15, s * 0.18, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#000'
  context.beginPath()
  context.arc(s * 0.5, -s * 0.15, s * 0.09, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(s * 0.53, -s * 0.18, s * 0.035, 0, Math.PI * 2)
  context.fill()

  if (isPlayer) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    context.lineWidth = 1.5
    context.beginPath()
    context.moveTo(s * 0.25, s * 0.1)
    context.quadraticCurveTo(s * 0.5, s * 0.25, s * 0.7, s * 0.1)
    context.stroke()
  }

  context.restore()
}

function drawBackground() {
  const w = canvasSize.value.w
  const h = canvasSize.value.h
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#1e3c72')
  grad.addColorStop(0.5, '#2a5298')
  grad.addColorStop(1, '#0f2027')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  for (let i = 0; i < 5; i++) {
    const rayX = (i / 5) * w + randRange(-20, 20)
    const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 50, h)
    rayGrad.addColorStop(0, 'rgba(255,255,255,0.08)')
    rayGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = rayGrad
    ctx.beginPath()
    ctx.moveTo(rayX, 0)
    ctx.lineTo(rayX + 60, 0)
    ctx.lineTo(rayX + 120, h)
    ctx.lineTo(rayX + 40, h)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawBubbles() {
  bubbles.forEach(b => {
    ctx.save()
    ctx.globalAlpha = b.alpha * b.life
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fill()
    ctx.restore()
  })
}

function draw() {
  if (!ctx) return

  drawBackground()
  drawBubbles()

  fishes.forEach(fish => {
    if (!fish.eaten) {
      const isBigger = fish.size > player.size * 1.05
      drawFish(ctx, fish.x, fish.y, fish.size, fish.facing,
        isBigger ? '#ff4444' : fish.color1,
        isBigger ? '#cc2222' : fish.color2,
        fish.tailPhase)
    }
  })

  if (!gameOver.value) {
    drawFish(ctx, player.x, player.y, player.size, player.facing,
      '#ffd700', '#ffaa00', performance.now() / 100, true)
  }

  if (gameOver.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvasSize.value.w, canvasSize.value.h)
  }
}

function checkCollision(fish) {
  const dx = player.x - fish.x
  const dy = player.y - fish.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = (player.size + fish.size) * 0.55
  return dist < minDist
}

function update(deltaTime) {
  const dx = player.targetX - player.x
  const dy = player.targetY - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 2) {
    const moveSpeed = Math.min(player.speed, dist * 0.15)
    player.x += (dx / dist) * moveSpeed
    player.y += (dy / dist) * moveSpeed
    if (Math.abs(dx) > 1) {
      player.facing = dx > 0 ? 1 : -1
    }
  }

  player.x = Math.max(player.size, Math.min(canvasSize.value.w - player.size, player.x))
  player.y = Math.max(player.size, Math.min(canvasSize.value.h - player.size, player.y))

  fishes.forEach(fish => {
    if (fish.eaten) return
    fish.x += fish.speed
    fish.tailPhase += 0.15

    if (checkCollision(fish)) {
      if (fish.size <= player.size * 0.95) {
        fish.eaten = true
        const sizeGain = fish.size * 0.12
        player.size = Math.min(BASE_PLAYER_SIZE * MAX_SIZE_LEVEL, player.size + sizeGain)
        player.speed = Math.max(2.5, 6 - (player.size - BASE_PLAYER_SIZE) * 0.03)
        score.value += Math.floor(fish.size * 2)
        for (let i = 0; i < 5; i++) {
          bubbles.push(createBubble(fish.x, fish.y))
        }

        spawnInterval = Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - score.value * 0.8)
      } else if (fish.size > player.size * 1.05) {
        gameOver.value = true
        isRunning.value = false
        stopGame()
        handleGameOver()
      }
    }
  })

  fishes = fishes.filter(fish => {
    if (fish.eaten) return false
    if (fish.speed > 0 && fish.x > canvasSize.value.w + fish.size * 3) return false
    if (fish.speed < 0 && fish.x < -fish.size * 3) return false
    return true
  })

  bubbles.forEach(b => {
    b.y -= b.speed
    b.life -= 0.01
  })
  bubbles = bubbles.filter(b => b.life > 0 && b.y > -10)

  if (Math.random() < 0.03) {
    bubbles.push({
      x: randRange(0, canvasSize.value.w),
      y: canvasSize.value.h + 5,
      size: randRange(2, 5),
      speed: randRange(0.3, 1),
      alpha: randRange(0.2, 0.5),
      life: 1
    })
  }
}

function loop(timestamp) {
  if (!isRunning.value) return
  const deltaTime = timestamp - lastTime
  lastTime = timestamp
  update(deltaTime)
  draw()
  animationFrame = requestAnimationFrame(loop)
}

function spawnFish() {
  if (!isRunning.value) return
  fishes.push(createFish())
  spawnTimer = setTimeout(spawnFish, spawnInterval + randRange(-150, 150))
}

function initGame() {
  fishes = []
  bubbles = []
  score.value = 0
  gameOver.value = false
  isRunning.value = false
  scoreSubmitted = false
  spawnInterval = INITIAL_SPAWN_INTERVAL

  player.x = canvasSize.value.w / 2
  player.y = canvasSize.value.h / 2
  player.targetX = player.x
  player.targetY = player.y
  player.size = BASE_PLAYER_SIZE
  player.speed = 6
  player.facing = 1

  for (let i = 0; i < 3; i++) {
    fishes.push(createFish())
  }
  draw()
}

function startGame() {
  if (gameOver.value) {
    initGame()
  }
  isRunning.value = true
  lastTime = performance.now()
  animationFrame = requestAnimationFrame(loop)
  spawnTimer = setTimeout(spawnFish, 800)
}

function pauseGame() {
  isRunning.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  if (spawnTimer) {
    clearTimeout(spawnTimer)
    spawnTimer = null
  }
}

function stopGame() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  if (spawnTimer) {
    clearTimeout(spawnTimer)
    spawnTimer = null
  }
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

function resetGame() {
  stopGame()
  initGame()
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('bigfish', score.value)
  }
}

function goBack() {
  stopGame()
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    submitScore('bigfish', score.value)
  }
  router.push({ path: '/home' })
}

function getCanvasPos(clientX, clientY) {
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasSize.value.w / rect.width
  const scaleY = canvasSize.value.h / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

function handleMouseMove(e) {
  if (!isRunning.value) return
  const pos = getCanvasPos(e.clientX, e.clientY)
  player.targetX = pos.x
  player.targetY = pos.y
}

let touchActive = false

function handleTouchStart(e) {
  touchActive = true
  if (e.touches.length > 0) {
    const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY)
    player.targetX = pos.x
    player.targetY = pos.y
    if (!isRunning.value && !gameOver.value) {
      startGame()
    }
  }
}

function handleTouchMove(e) {
  if (!touchActive || e.touches.length === 0) return
  const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY)
  player.targetX = pos.x
  player.targetY = pos.y
}

function handleTouchEnd() {
  touchActive = false
}

function handleKeydown(e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' ', 'r', 'R'].includes(e.key)) {
    e.preventDefault()
  }
  const moveStep = 20
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    player.targetX = Math.max(player.size, player.targetX - moveStep)
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    player.targetX = Math.min(canvasSize.value.w - player.size, player.targetX + moveStep)
  } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    player.targetY = Math.max(player.size, player.targetY - moveStep)
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    player.targetY = Math.min(canvasSize.value.h - player.size, player.targetY + moveStep)
  } else if (e.key === ' ') {
    toggleGame()
  } else if (e.key === 'r' || e.key === 'R') {
    resetGame()
  }
}

function getSafeAreaBottom() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0
}

function resizeCanvas() {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  const headerH = 76
  const scoreRowH = 80
  const statusH = gameOver.value || (!isRunning.value && score.value > 0) ? 50 : 0
  const controlH = 70
  const tipsH = 60
  const marginsH = 32
  const safeBottom = getSafeAreaBottom()
  const occupiedH = headerH + scoreRowH + statusH + controlH + tipsH + marginsH + safeBottom

  const maxH = Math.max(300, screenHeight - occupiedH)
  const maxW = Math.min(screenWidth - 40, screenHeight * 0.7)

  const ratio = 360 / 500
  let w = maxW
  let h = w / ratio
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }
  canvasSize.value = { w, h }

  if (canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    canvasRef.value.width = w * dpr
    canvasRef.value.height = h * dpr
    canvasRef.value.style.width = w + 'px'
    canvasRef.value.style.height = h + 'px'
    ctx = canvasRef.value.getContext('2d')
    ctx.scale(dpr, dpr)
  }

  player.x = Math.min(player.x, w - player.size)
  player.y = Math.min(player.y, h - player.size)
  player.targetX = Math.min(player.targetX, w - player.size)
  player.targetY = Math.min(player.targetY, h - player.size)
}

onMounted(() => {
  loadHighScores()
  nextTick(() => {
    resizeCanvas()
    initGame()
  })

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', () => {
    nextTick(() => {
      resizeCanvas()
      draw()
    })
  })
})

onUnmounted(() => {
  stopGame()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-bigfish {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #0f2027 100%);
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

.bigfish-canvas {
  cursor: none;
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

.tips {
  margin-top: 12px;
  padding-left: 20px;
  padding-right: 20px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.tip-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}
</style>
