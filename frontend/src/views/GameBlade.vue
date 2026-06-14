<template>
  <div class="page-container game-blade" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">⚔️ 转刀割草</div>
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
        <div class="score-label">刀数</div>
        <div class="score-value">{{ bladeCount }}</div>
      </div>
    </div>

    <div class="game-canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
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

    <div class="game-tip">
      <p>💡 拖动控制玩家移动，躲避敌人，用旋转的刀消灭它们！</p>
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

const canvasWidth = ref(360)
const canvasHeight = ref(480)
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)
const bladeCount = ref(1)

const highScore = computed(() => highScores['blade'] || 0)

let ctx = null
let animationId = null
let scoreSubmitted = false

let player = { x: 0, y: 0, radius: 20 }
let blades = []
let bladeAngle = 0
let bladeSpeed = 0.05
let bladeRadius = 60
let bladeLength = 40
let bladeWidth = 6

let enemies = []
let enemySpawnTimer = 0
let enemySpawnInterval = 60
let enemySpeed = 1.5

let powerups = []
let powerupSpawnTimer = 0
let powerupSpawnInterval = 600

let particles = []

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let playerStartX = 0
let playerStartY = 0

function initGame() {
  player.x = canvasWidth.value / 2
  player.y = canvasHeight.value / 2
  player.radius = 20

  bladeCount.value = 1
  bladeAngle = 0
  bladeSpeed = 0.05
  bladeRadius = 60

  enemies = []
  enemySpawnTimer = 0
  enemySpawnInterval = 60
  enemySpeed = 1.5

  powerups = []
  powerupSpawnTimer = 0
  powerupSpawnInterval = 600

  particles = []

  score.value = 0
  gameOver.value = false
  isRunning.value = false
  scoreSubmitted = false

  updateBlades()
  draw()
}

function updateBlades() {
  blades = []
  const count = bladeCount.value
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + bladeAngle
    blades.push({
      angle: angle,
      x: player.x + Math.cos(angle) * bladeRadius,
      y: player.y + Math.sin(angle) * bladeRadius
    })
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4)
  let x, y

  switch (side) {
    case 0:
      x = Math.random() * canvasWidth.value
      y = -20
      break
    case 1:
      x = canvasWidth.value + 20
      y = Math.random() * canvasHeight.value
      break
    case 2:
      x = Math.random() * canvasWidth.value
      y = canvasHeight.value + 20
      break
    case 3:
      x = -20
      y = Math.random() * canvasHeight.value
      break
  }

  const types = ['normal', 'fast', 'tank']
  const type = types[Math.floor(Math.random() * types.length)]

  let enemy = { x, y, type }

  switch (type) {
    case 'normal':
      enemy.radius = 15
      enemy.speed = enemySpeed
      enemy.hp = 1
      enemy.color = '#4ade80'
      enemy.score = 10
      break
    case 'fast':
      enemy.radius = 10
      enemy.speed = enemySpeed * 1.8
      enemy.hp = 1
      enemy.color = '#facc15'
      enemy.score = 15
      break
    case 'tank':
      enemy.radius = 22
      enemy.speed = enemySpeed * 0.6
      enemy.hp = 3
      enemy.color = '#f87171'
      enemy.score = 30
      break
  }

  enemies.push(enemy)
}

function spawnPowerup() {
  const margin = 40
  const x = margin + Math.random() * (canvasWidth.value - margin * 2)
  const y = margin + Math.random() * (canvasHeight.value - margin * 2)

  powerups.push({
    x,
    y,
    radius: 18,
    type: 'blade',
    pulse: 0
  })
}

function addParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      color,
      life: 1
    })
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life -= 0.02
    p.radius *= 0.98

    if (p.life <= 0) {
      particles.splice(i, 1)
    }
  }
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    const dx = enemy.x - player.x
    const dy = enemy.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + enemy.radius) {
      gameOver.value = true
      isRunning.value = false
      handleGameOver()
      return
    }

    for (let j = 0; j < blades.length; j++) {
      const blade = blades[j]
      const bdx = blade.x - player.x
      const bdy = blade.y - player.y

      const bladeEndX = blade.x + (bdx / bladeRadius) * bladeLength
      const bladeEndY = blade.y + (bdy / bladeRadius) * bladeLength

      const bdist = pointToLineDistance(
        enemy.x, enemy.y,
        blade.x, blade.y,
        bladeEndX, bladeEndY
      )

      if (bdist < enemy.radius + bladeWidth / 2) {
        const tipDist = Math.sqrt(
          Math.pow(enemy.x - bladeEndX, 2) +
          Math.pow(enemy.y - bladeEndY, 2)
        )
        const baseDist = Math.sqrt(
          Math.pow(enemy.x - blade.x, 2) +
          Math.pow(enemy.y - blade.y, 2)
        )

        if (tipDist < enemy.radius + bladeWidth / 2 ||
            baseDist < enemy.radius + bladeWidth / 2 ||
            bdist < enemy.radius + bladeWidth / 2) {
          enemy.hp--
          addParticles(enemy.x, enemy.y, enemy.color, 5)

          if (enemy.hp <= 0) {
            score.value += enemy.score
            addParticles(enemy.x, enemy.y, enemy.color, 12)
            enemies.splice(i, 1)

            if (score.value % 200 === 0 && enemySpawnInterval > 20) {
              enemySpawnInterval -= 5
            }
            if (score.value % 500 === 0) {
              enemySpeed += 0.2
            }
          }
          break
        }
      }
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i]
    const dx = powerup.x - player.x
    const dy = powerup.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + powerup.radius) {
      if (powerup.type === 'blade') {
        bladeCount.value++
        if (bladeCount.value > 8) bladeCount.value = 8
        bladeSpeed += 0.005
        if (bladeRadius < 80) bladeRadius += 3
        updateBlades()
      }
      addParticles(powerup.x, powerup.y, '#fbbf24', 15)
      powerups.splice(i, 1)
    }
  }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy
  return Math.sqrt(dx * dx + dy * dy)
}

function updateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]
    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed
      enemy.y += (dy / dist) * enemy.speed
    }
  }
}

function drawPlayer() {
  ctx.save()
  ctx.shadowColor = '#60a5fa'
  ctx.shadowBlur = 20

  const gradient = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, player.radius
  )
  gradient.addColorStop(0, '#93c5fd')
  gradient.addColorStop(1, '#3b82f6')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(player.x - 5, player.y - 3, 4, 0, Math.PI * 2)
  ctx.arc(player.x + 5, player.y - 3, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1e3a5f'
  ctx.beginPath()
  ctx.arc(player.x - 4, player.y - 3, 2, 0, Math.PI * 2)
  ctx.arc(player.x + 6, player.y - 3, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawBlades() {
  for (let i = 0; i < blades.length; i++) {
    const blade = blades[i]
    const angle = Math.atan2(blade.y - player.y, blade.x - player.x)

    const tipX = player.x + Math.cos(angle) * (bladeRadius + bladeLength)
    const tipY = player.y + Math.sin(angle) * (bladeRadius + bladeLength)
    const baseX = player.x + Math.cos(angle) * bladeRadius
    const baseY = player.y + Math.sin(angle) * bladeRadius

    ctx.save()
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 15

    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = bladeWidth
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()

    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    ctx.arc(baseX, baseY, bladeWidth / 2 + 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fce7f3'
    ctx.beginPath()
    ctx.arc(tipX, tipY, bladeWidth / 2 + 1, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

function drawEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]

    ctx.save()
    ctx.shadowColor = enemy.color
    ctx.shadowBlur = 10

    ctx.fillStyle = enemy.color
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    const eyeOffset = enemy.radius * 0.3
    const eyeSize = enemy.radius * 0.25
    ctx.beginPath()
    ctx.arc(enemy.x - eyeOffset, enemy.y - eyeOffset * 0.5, eyeSize, 0, Math.PI * 2)
    ctx.arc(enemy.x + eyeOffset, enemy.y - eyeOffset * 0.5, eyeSize, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(enemy.x - eyeOffset + 1, enemy.y - eyeOffset * 0.5, eyeSize * 0.5, 0, Math.PI * 2)
    ctx.arc(enemy.x + eyeOffset + 1, enemy.y - eyeOffset * 0.5, eyeSize * 0.5, 0, Math.PI * 2)
    ctx.fill()

    if (enemy.type === 'tank' && enemy.hp > 1) {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(enemy.hp, enemy.x, enemy.y + enemy.radius * 0.1)
    }

    ctx.restore()
  }
}

function drawPowerups() {
  for (let i = 0; i < powerups.length; i++) {
    const powerup = powerups[i]
    powerup.pulse = (powerup.pulse + 0.05) % (Math.PI * 2)
    const pulseScale = 1 + Math.sin(powerup.pulse) * 0.1

    ctx.save()
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 15

    const gradient = ctx.createRadialGradient(
      powerup.x, powerup.y, 0,
      powerup.x, powerup.y, powerup.radius * pulseScale
    )
    gradient.addColorStop(0, '#fde68a')
    gradient.addColorStop(1, '#f59e0b')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(powerup.x, powerup.y, powerup.radius * pulseScale, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('+1', powerup.x, powerup.y)

    ctx.restore()
  }
}

function drawParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    ctx.save()
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight.value)
  gradient.addColorStop(0, '#1a1a2e')
  gradient.addColorStop(1, '#16213e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  const gridSize = 30
  for (let x = 0; x < canvasWidth.value; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight.value)
    ctx.stroke()
  }
  for (let y = 0; y < canvasHeight.value; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth.value, y)
    ctx.stroke()
  }
}

function draw() {
  if (!ctx) return

  drawBackground()
  drawParticles()
  drawPowerups()
  drawEnemies()
  drawBlades()
  drawPlayer()

  if (gameOver.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  }
}

function gameLoop() {
  if (!isRunning.value || gameOver.value) return

  bladeAngle += bladeSpeed
  updateBlades()

  enemySpawnTimer++
  if (enemySpawnTimer >= enemySpawnInterval) {
    spawnEnemy()
    enemySpawnTimer = 0
  }

  powerupSpawnTimer++
  if (powerupSpawnTimer >= powerupSpawnInterval) {
    spawnPowerup()
    powerupSpawnTimer = 0
  }

  updateEnemies()
  updateParticles()
  checkCollisions()

  draw()

  animationId = requestAnimationFrame(gameLoop)
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
  gameLoop()
}

function pauseGame() {
  isRunning.value = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

function resetGame() {
  pauseGame()
  initGame()
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('blade', score.value)
  }
}

function goBack() {
  pauseGame()
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    submitScore('blade', score.value)
  }
  router.push({ path: '/home' })
}

function getCanvasPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height

  let clientX, clientY
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

function handleTouchStart(e) {
  if (!isRunning.value) return
  isDragging = true
  const pos = getCanvasPos(e)
  dragStartX = pos.x
  dragStartY = pos.y
  playerStartX = player.x
  playerStartY = player.y
}

function handleTouchMove(e) {
  if (!isRunning.value || !isDragging) return
  const pos = getCanvasPos(e)
  const dx = pos.x - dragStartX
  const dy = pos.y - dragStartY

  let newX = playerStartX + dx
  let newY = playerStartY + dy

  newX = Math.max(player.radius, Math.min(canvasWidth.value - player.radius, newX))
  newY = Math.max(player.radius, Math.min(canvasHeight.value - player.radius, newY))

  player.x = newX
  player.y = newY
  updateBlades()
}

function handleTouchEnd() {
  isDragging = false
}

function handleMouseDown(e) {
  if (!isRunning.value) return
  isDragging = true
  const pos = getCanvasPos(e)
  dragStartX = pos.x
  dragStartY = pos.y
  playerStartX = player.x
  playerStartY = player.y
}

function handleMouseMove(e) {
  if (!isRunning.value || !isDragging) return
  const pos = getCanvasPos(e)
  const dx = pos.x - dragStartX
  const dy = pos.y - dragStartY

  let newX = playerStartX + dx
  let newY = playerStartY + dy

  newX = Math.max(player.radius, Math.min(canvasWidth.value - player.radius, newX))
  newY = Math.max(player.radius, Math.min(canvasHeight.value - player.radius, newY))

  player.x = newX
  player.y = newY
  updateBlades()
}

function handleMouseUp() {
  isDragging = false
}

function handleKeydown(e) {
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
  canvasWidth.value = screenWidth
  canvasHeight.value = screenWidth * 1.3

  if (canvasRef.value) {
    const dpr = window.devicePixelRatio || 1
    canvasRef.value.width = canvasWidth.value * dpr
    canvasRef.value.height = canvasHeight.value * dpr
    canvasRef.value.style.width = canvasWidth.value + 'px'
    canvasRef.value.style.height = canvasHeight.value + 'px'
    ctx = canvasRef.value.getContext('2d')
    ctx.scale(dpr, dpr)
  }
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
  pauseGame()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-blade {
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

.score-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 20px;
}

.score-row .score-display {
  min-width: 80px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  text-align: center;
  color: white;
}

.score-row .score-label {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.score-row .score-value {
  font-size: 20px;
  font-weight: 700;
}

.game-canvas-wrapper {
  padding: 0;
}

.game-canvas {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  touch-action: none;
  user-select: none;
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

.game-tip {
  margin-top: 12px;
  padding: 0 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.game-tip p {
  margin: 0;
  line-height: 1.5;
}
</style>
