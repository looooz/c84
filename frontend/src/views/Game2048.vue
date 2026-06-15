<template>
  <div class="page-container game-2048" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">2048</div>
      <button class="new-game-btn" @click="newGame">
        新游戏
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
    </div>

    <div class="game-canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="game-canvas"
      ></canvas>
    </div>

    <div class="game-overlay" v-if="showStartScreen">
      <div class="overlay-content">
        <div class="overlay-title">2️⃣0️⃣4️⃣8️⃣</div>
        <div class="overlay-desc">滑动或使用方向键移动数字方块<br/>相同数字的方块碰撞会合并<br/>合并出 2048 即可获胜！</div>
        <button class="overlay-btn start" @click="startGame">开始游戏</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="game-overlay" v-if="gameOver">
      <div class="overlay-content">
        <div class="overlay-title gameover">💀 游戏结束</div>
        <div class="overlay-score">最终得分：{{ score }}</div>
        <div class="overlay-level">最高分：{{ highScore }}</div>
        <button class="overlay-btn" @click="newGame">重新开始</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="direction-buttons">
      <div class="dir-row">
        <button class="dir-btn" @click="move('up')" @touchstart.prevent="move('up')">
          <el-icon :size="28"><ArrowUp /></el-icon>
        </button>
      </div>
      <div class="dir-row">
        <button class="dir-btn" @click="move('left')" @touchstart.prevent="move('left')">
          <el-icon :size="28"><ArrowLeft /></el-icon>
        </button>
        <button class="dir-btn center-btn" @click="newGame" @touchstart.prevent="newGame">
          <el-icon :size="28"><Refresh /></el-icon>
        </button>
        <button class="dir-btn" @click="move('right')" @touchstart.prevent="move('right')">
          <el-icon :size="28"><ArrowRight /></el-icon>
        </button>
      </div>
      <div class="dir-row">
        <button class="dir-btn" @click="move('down')" @touchstart.prevent="move('down')">
          <el-icon :size="28"><ArrowDown /></el-icon>
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
const loadHighScores = inject('loadHighScores')

const GRID_SIZE = 4
const CELL_PADDING = 8

const canvasSize = ref(300)
const score = ref(0)
const gameOver = ref(false)
const showStartScreen = ref(true)

const highScore = computed(() => highScores['2048'] || 0)

let grid = []
let ctx = null
let cellSize = 0
let swipeHandler = null
let isAnimating = false
let animationQueue = []
let scoreSubmitted = false

const cellColors = {
  0: 'rgba(238, 228, 218, 0.35)',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
  4096: '#3c3a32',
  8192: '#3c3a32'
}

const textColors = {
  2: '#776e65',
  4: '#776e65',
  8: '#f9f6f2',
  16: '#f9f6f2',
  32: '#f9f6f2',
  64: '#f9f6f2',
  128: '#f9f6f2',
  256: '#f9f6f2',
  512: '#f9f6f2',
  1024: '#f9f6f2',
  2048: '#f9f6f2',
  4096: '#f9f6f2',
  8192: '#f9f6f2'
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

function drawCell(x, y, value, scale = 1, offsetX = 0, offsetY = 0) {
  const cellX = x * cellSize + CELL_PADDING + offsetX
  const cellY = y * cellSize + CELL_PADDING + offsetY
  const cellInnerSize = cellSize - CELL_PADDING * 2
  const drawSize = cellInnerSize * scale
  const drawX = cellX + (cellInnerSize - drawSize) / 2
  const drawY = cellY + (cellInnerSize - drawSize) / 2
  const radius = drawSize * 0.12

  const color = cellColors[value] || '#3c3a32'
  ctx.fillStyle = color
  drawRoundedRect(drawX, drawY, drawSize, drawSize, radius)
  ctx.fill()

  if (value > 0) {
    const textColor = textColors[value] || '#f9f6f2'
    ctx.fillStyle = textColor
    ctx.font = `bold ${drawSize * 0.45}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const text = value.toString()
    if (text.length >= 4) {
      ctx.font = `bold ${drawSize * 0.3}px Arial, sans-serif`
    } else if (text.length >= 3) {
      ctx.font = `bold ${drawSize * 0.35}px Arial, sans-serif`
    }
    ctx.fillText(text, drawX + drawSize / 2, drawY + drawSize / 2)
  }
}

function draw() {
  if (!ctx) return

  ctx.fillStyle = '#bbada0'
  drawRoundedRect(0, 0, canvasSize.value, canvasSize.value, 12)
  ctx.fill()

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      drawCell(j, i, 0)
    }
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const cell = grid[i][j]
      if (cell.value > 0) {
        let scale = 1
        let offsetX = 0
        let offsetY = 0

        for (const anim of animationQueue) {
          if (anim.type === 'appear' && anim.x === j && anim.y === i) {
            scale = 0.1 + anim.progress * 0.9
          } else if (anim.type === 'move' && anim.toX === j && anim.toY === i) {
            const progress = anim.progress
            offsetX = (anim.fromX - anim.toX) * cellSize * (1 - progress)
            offsetY = (anim.fromY - anim.toY) * cellSize * (1 - progress)
          } else if (anim.type === 'merge' && anim.x === j && anim.y === i) {
            scale = 1 + Math.sin(anim.progress * Math.PI) * 0.2
          }
        }

        drawCell(j, i, cell.value, scale, offsetX, offsetY)
      }
    }
  }
}

function updateAnimations() {
  if (animationQueue.length === 0) {
    isAnimating = false
    draw()
    return
  }

  isAnimating = true
  const animationSpeed = 0.15

  for (let i = animationQueue.length - 1; i >= 0; i--) {
    animationQueue[i].progress += animationSpeed
    if (animationQueue[i].progress >= 1) {
      if (animationQueue[i].type === 'appear') {
        const { x, y } = animationQueue[i]
        grid[y][x].isNew = false
      }
      if (animationQueue[i].type === 'merge') {
        const { x, y } = animationQueue[i]
        grid[y][x].mergedFrom = null
      }
      animationQueue.splice(i, 1)
    }
  }

  draw()

  if (animationQueue.length > 0) {
    requestAnimationFrame(updateAnimations)
  } else {
    isAnimating = false
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        grid[i][j].isNew = false
        grid[i][j].mergedFrom = null
      }
    }
  }
}

function slide(row) {
  let arr = row.filter(cell => cell.value > 0)
  let missing = GRID_SIZE - arr.length
  let zeros = Array(missing).fill(null).map(() => ({ value: 0 }))
  return zeros.concat(arr)
}

function combine(row) {
  let moved = false
  for (let i = GRID_SIZE - 1; i > 0; i--) {
    if (row[i].value === row[i - 1].value && row[i].value !== 0) {
      row[i].value *= 2
      row[i].mergedFrom = [row[i - 1], row[i]]
      row[i - 1].value = 0
      score.value += row[i].value
      moved = true
    }
  }
  return { row, moved }
}

function getCopy() {
  let copy = []
  for (let i = 0; i < GRID_SIZE; i++) {
    copy[i] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      copy[i][j] = grid[i][j].value
    }
  }
  return copy
}

function compare(a, b) {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (a[i][j] !== b[i][j]) return false
    }
  }
  return true
}

function createCell(value = 0) {
  return {
    value,
    id: Math.random().toString(36).substr(2, 9),
    isNew: false,
    mergedFrom: null,
    position: { x: 0, y: 0 }
  }
}

function initGrid() {
  grid = []
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      grid[i][j] = createCell(0)
      grid[i][j].position = { x: j, y: i }
    }
  }
}

function addRandomTile() {
  const emptyCells = []
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j].value === 0) {
        emptyCells.push({ x: j, y: i })
      }
    }
  }
  if (emptyCells.length > 0) {
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    const newCell = createCell(Math.random() < 0.9 ? 2 : 4)
    newCell.position = { x: randomCell.x, y: randomCell.y }
    newCell.isNew = true
    grid[randomCell.y][randomCell.x] = newCell
    animationQueue.push({
      type: 'appear',
      x: randomCell.x,
      y: randomCell.y,
      progress: 0
    })
  }
}

function move(direction) {
  if (gameOver.value || isAnimating) return

  const oldGrid = getCopy()
  animationQueue = []
  let moved = false

  function processLine(line, isRow, index) {
    const positions = line.map((cell, idx) => ({
      cell,
      originalIdx: idx,
      id: cell.id,
      value: cell.value
    }))

    let filtered = line.filter(cell => cell.value > 0)
    const missing = GRID_SIZE - filtered.length
    const zeros = Array(missing).fill(null).map(() => createCell(0))
    let result = zeros.concat(filtered)

    for (let i = GRID_SIZE - 1; i > 0; i--) {
      if (result[i].value === result[i - 1].value && result[i].value !== 0) {
        const newValue = result[i].value * 2
        const mergedCell = createCell(newValue)
        mergedCell.mergedFrom = [result[i - 1], result[i]]

        const pos1 = positions.find(p => p.id === result[i - 1].id)
        const pos2 = positions.find(p => p.id === result[i].id)

        if (isRow) {
          if (pos1) {
            animationQueue.push({
              type: 'move',
              fromX: pos1.originalIdx,
              fromY: index,
              toX: i,
              toY: index,
              progress: 0
            })
          }
          if (pos2) {
            animationQueue.push({
              type: 'move',
              fromX: pos2.originalIdx,
              fromY: index,
              toX: i,
              toY: index,
              progress: 0
            })
          }
          mergedCell.position = { x: i, y: index }
        } else {
          if (pos1) {
            animationQueue.push({
              type: 'move',
              fromX: index,
              fromY: pos1.originalIdx,
              toX: index,
              toY: i,
              progress: 0
            })
          }
          if (pos2) {
            animationQueue.push({
              type: 'move',
              fromX: index,
              fromY: pos2.originalIdx,
              toX: index,
              toY: i,
              progress: 0
            })
          }
          mergedCell.position = { x: index, y: i }
        }

        animationQueue.push({
          type: 'merge',
          x: isRow ? i : index,
          y: isRow ? index : i,
          progress: 0
        })

        result[i] = mergedCell
        result[i - 1] = createCell(0)
        score.value += newValue
        moved = true
      }
    }

    filtered = result.filter(cell => cell.value > 0)
    const missing2 = GRID_SIZE - filtered.length
    const zeros2 = Array(missing2).fill(null).map(() => createCell(0))
    result = zeros2.concat(filtered)

    for (let i = 0; i < GRID_SIZE; i++) {
      if (result[i].value > 0 && !result[i].mergedFrom) {
        const pos = positions.find(p => p.id === result[i].id)
        if (pos && pos.originalIdx !== i) {
          if (isRow) {
            animationQueue.push({
              type: 'move',
              fromX: pos.originalIdx,
              fromY: index,
              toX: i,
              toY: index,
              progress: 0
            })
          } else {
            animationQueue.push({
              type: 'move',
              fromX: index,
              fromY: pos.originalIdx,
              toX: index,
              toY: i,
              progress: 0
            })
          }
          result[i].position = {
            x: isRow ? i : index,
            y: isRow ? index : i
          }
          moved = true
        }
      }
    }

    return result
  }

  if (direction === 'right') {
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[i] = processLine(grid[i], true, i)
    }
  } else if (direction === 'left') {
    for (let i = 0; i < GRID_SIZE; i++) {
      let row = grid[i].slice().reverse()
      row = processLine(row, true, i)
      row.reverse()
      for (let j = 0; j < GRID_SIZE; j++) {
        row[j].position = { x: j, y: i }
      }
      grid[i] = row
    }
  } else if (direction === 'down') {
    for (let j = 0; j < GRID_SIZE; j++) {
      let col = []
      for (let i = 0; i < GRID_SIZE; i++) {
        col.push(grid[i][j])
      }
      col = processLine(col, false, j)
      for (let i = 0; i < GRID_SIZE; i++) {
        col[i].position = { x: j, y: i }
        grid[i][j] = col[i]
      }
    }
  } else if (direction === 'up') {
    for (let j = 0; j < GRID_SIZE; j++) {
      let col = []
      for (let i = 0; i < GRID_SIZE; i++) {
        col.push(grid[i][j])
      }
      col.reverse()
      col = processLine(col, false, j)
      col.reverse()
      for (let i = 0; i < GRID_SIZE; i++) {
        col[i].position = { x: j, y: i }
        grid[i][j] = col[i]
      }
    }
  }

  const newGrid = getCopy()
  if (!compare(oldGrid, newGrid)) {
    moved = true
  }

  if (moved) {
    updateAnimations()
    setTimeout(() => {
      addRandomTile()
      updateAnimations()
      checkGameOver()
    }, 150)
  } else {
    draw()
  }
}

function checkGameOver() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j].value === 0) return false
      if (j < GRID_SIZE - 1 && grid[i][j].value === grid[i][j + 1].value) return false
      if (i < GRID_SIZE - 1 && grid[i][j].value === grid[i + 1][j].value) return false
    }
  }
  gameOver.value = true
  handleGameOver()
  return true
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('2048', score.value)
  }
}

function startGame() {
  showStartScreen.value = false
  newGame()
}

function newGame() {
  score.value = 0
  gameOver.value = false
  scoreSubmitted = false
  initGrid()
  animationQueue = []
  addRandomTile()
  addRandomTile()
  updateAnimations()
}

async function goBack() {
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    try {
      await submitScore('2048', score.value)
    } catch (e) {
      console.error('提交分数失败:', e)
    }
  }
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
    'd': 'right'
  }
  if (keyMap[e.key]) {
    e.preventDefault()
    move(keyMap[e.key])
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
  loadHighScores()
  nextTick(() => {
    resizeCanvas()
    initGrid()
    draw()
  })

  swipeHandler = useSwipe(pageRef.value, {
    onSwipeUp: () => move('up'),
    onSwipeDown: () => move('down'),
    onSwipeLeft: () => move('left'),
    onSwipeRight: () => move('right'),
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
  if (swipeHandler) {
    swipeHandler.unbind()
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-2048 {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
.new-game-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.3);
}

.game-title {
  font-size: 28px;
  font-weight: 800;
  color: white;
  letter-spacing: 2px;
}

.new-game-btn {
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
  gap: 16px;
  margin-bottom: 16px;
  padding: 0 20px;
}

.score-row .score-display {
  min-width: 120px;
}

.game-canvas-wrapper {
  padding: 0;
}

.game-status {
  margin-top: 16px;
  text-align: center;
  color: white;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.status-score {
  font-size: 16px;
  opacity: 0.9;
}

.direction-buttons {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
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

.center-btn {
  background: rgba(255, 255, 255, 0.3);
}

.center-btn:active {
  background: rgba(255, 255, 255, 0.5);
}

.game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.overlay-content {
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px 28px;
  text-align: center;
  color: white;
  max-width: 320px;
  width: 85%;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.overlay-title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.overlay-title.gameover {
  color: #ff6b6b;
}

.overlay-desc {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 20px;
  line-height: 1.8;
}

.overlay-score {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.overlay-level {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 20px;
}

.overlay-btn {
  width: 100%;
  padding: 14px 24px;
  border-radius: 14px;
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
}

.overlay-btn.start {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.overlay-btn.secondary {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  box-shadow: none;
  margin-top: 10px;
}

.overlay-btn:active {
  transform: scale(0.95);
}
</style>
