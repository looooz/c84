<template>
  <div class="page-container game-tank" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">🎮 坦克大战</div>
      <button class="reset-btn" @click="resetGame">
        重置
      </button>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">第</span>
        <span class="status-value level">{{ level }}</span>
        <span class="status-label">关</span>
      </div>
      <div class="status-item">
        <span class="status-label">生命</span>
        <span class="status-value lives">{{ lives }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">得分</span>
        <span class="status-value">{{ score }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">敌人</span>
        <span class="status-value">{{ enemiesRemaining }}</span>
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
        <div class="overlay-title">🎮 坦克大战</div>
        <div class="overlay-desc">
          使用方向键或 WASD 移动坦克<br/>
          空格键或 J 键发射炮弹<br/>
          消灭所有敌人，保护基地！
        </div>
        <button class="overlay-btn start" @click="startGame">开始游戏</button>
      </div>
    </div>

    <div class="game-overlay" v-if="showLevelComplete">
      <div class="overlay-content">
        <div class="overlay-title">🎉 关卡完成！</div>
        <div class="overlay-score">当前得分：{{ score }}</div>
        <div class="overlay-bonus">关卡奖励：+{{ levelBonus }}分</div>
        <button class="overlay-btn" @click="nextLevel">下一关</button>
      </div>
    </div>

    <div class="game-overlay" v-if="gameOver">
      <div class="overlay-content">
        <div class="overlay-title gameover">💀 游戏结束</div>
        <div class="overlay-score">最终得分：{{ score }}</div>
        <div class="overlay-level">到达关卡：第 {{ level }} 关</div>
        <button class="overlay-btn" @click="resetGame">重新开始</button>
      </div>
    </div>

    <div class="control-panel" v-if="isRunning && !gameOver && !showLevelComplete">
      <button class="control-btn pause-btn" @click="togglePause">
        <el-icon :size="20"><Pause /></el-icon>
        <span>暂停</span>
      </button>
    </div>

    <div class="control-panel" v-if="isPaused && !gameOver && !showLevelComplete">
      <button class="control-btn start-btn" @click="togglePause">
        <el-icon :size="20"><VideoPlay /></el-icon>
        <span>继续</span>
      </button>
    </div>

    <div class="mobile-controls" v-if="showMobileControls">
      <div class="direction-pad">
        <div class="dir-row">
          <button
            class="dir-btn"
            @touchstart.prevent="handleDirStart('up')"
            @touchend.prevent="handleDirEnd('up')"
            @mousedown.prevent="handleDirStart('up')"
            @mouseup.prevent="handleDirEnd('up')"
            @mouseleave="handleDirEnd('up')"
          >
            <el-icon :size="28"><ArrowUp /></el-icon>
          </button>
        </div>
        <div class="dir-row">
          <button
            class="dir-btn"
            @touchstart.prevent="handleDirStart('left')"
            @touchend.prevent="handleDirEnd('left')"
            @mousedown.prevent="handleDirStart('left')"
            @mouseup.prevent="handleDirEnd('left')"
            @mouseleave="handleDirEnd('left')"
          >
            <el-icon :size="28"><ArrowLeft /></el-icon>
          </button>
          <div class="dir-center"></div>
          <button
            class="dir-btn"
            @touchstart.prevent="handleDirStart('right')"
            @touchend.prevent="handleDirEnd('right')"
            @mousedown.prevent="handleDirStart('right')"
            @mouseup.prevent="handleDirEnd('right')"
            @mouseleave="handleDirEnd('right')"
          >
            <el-icon :size="28"><ArrowRight /></el-icon>
          </button>
        </div>
        <div class="dir-row">
          <button
            class="dir-btn"
            @touchstart.prevent="handleDirStart('down')"
            @touchend.prevent="handleDirEnd('down')"
            @mousedown.prevent="handleDirStart('down')"
            @mouseup.prevent="handleDirEnd('down')"
            @mouseleave="handleDirEnd('down')"
          >
            <el-icon :size="28"><ArrowDown /></el-icon>
          </button>
        </div>
      </div>

      <div class="fire-btn-wrap">
        <button
          class="fire-btn"
          @touchstart.prevent="handleFire"
          @mousedown.prevent="handleFire"
        >
          <el-icon :size="32"><VideoPlay /></el-icon>
          <span>开火</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { TankGame } from '../game/tank/TankGame.js'
import { DIRECTION, GAME_CONFIG } from '../game/tank/constants.js'

const router = useRouter()
const pageRef = ref(null)
const canvasRef = ref(null)

const submitScore = inject('submitScore')
const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const canvasWidth = ref(420)
const canvasHeight = ref(480)
const score = ref(0)
const level = ref(1)
const lives = ref(GAME_CONFIG.PLAYER_INITIAL_LIVES)
const enemiesKilled = ref(0)
const enemiesTotal = ref(GAME_CONFIG.TOTAL_ENEMIES_PER_LEVEL)
const gameOver = ref(false)
const isRunning = ref(false)
const isPaused = ref(false)
const showLevelComplete = ref(false)
const showStartScreen = ref(true)
const levelBonus = ref(0)

const enemiesRemaining = computed(() => Math.max(0, enemiesTotal.value - enemiesKilled.value))
const showMobileControls = computed(() => isRunning.value && !gameOver.value && !showLevelComplete.value)

let ctx = null
let animationId = null
let tankGame = null
let scoreSubmitted = false
let lastTime = 0

function initGame() {
  level.value = 1
  score.value = 0
  gameOver.value = false
  showLevelComplete.value = false
  isRunning.value = false
  isPaused.value = false
  showStartScreen.value = true
  scoreSubmitted = false

  initLevel()
}

function initLevel() {
  if (!tankGame) {
    tankGame = new TankGame()
    tankGame.onStateChange = handleStateChange
  }
  tankGame.init(level.value)
  updateFromGameState()
  draw()
}

function handleStateChange(state) {
  score.value = state.score
  level.value = state.level
  lives.value = state.lives
  enemiesKilled.value = state.enemiesKilled
  enemiesTotal.value = state.enemiesTotal

  if (state.gameOver && !gameOver.value) {
    endGame()
  }
  if (state.levelComplete && !showLevelComplete.value) {
    completeLevel()
  }
}

function updateFromGameState() {
  if (tankGame) {
    score.value = tankGame.score
    level.value = tankGame.level
    lives.value = tankGame.playerLives
    enemiesKilled.value = tankGame.enemiesKilled
    enemiesTotal.value = tankGame.totalEnemies
  }
}

function startGame() {
  showStartScreen.value = false
  isRunning.value = true
  isPaused.value = false
  tankGame.start()
  lastTime = performance.now()
  gameLoop()
}

function togglePause() {
  if (isPaused.value) {
    isPaused.value = false
    tankGame.resume()
    lastTime = performance.now()
    gameLoop()
  } else {
    isPaused.value = true
    tankGame.pause()
    cancelAnimationFrame(animationId)
  }
}

function resetGame() {
  cancelAnimationFrame(animationId)
  initGame()
}

function nextLevel() {
  showLevelComplete.value = false
  level.value++
  tankGame.nextLevel()
  updateFromGameState()
  isRunning.value = true
  isPaused.value = false
  tankGame.start()
  lastTime = performance.now()
  gameLoop()
}

function completeLevel() {
  showLevelComplete.value = true
  isRunning.value = false
  isPaused.value = true
  levelBonus.value = level.value * 500
  score.value += levelBonus.value
  cancelAnimationFrame(animationId)
}

async function endGame() {
  gameOver.value = true
  isRunning.value = false
  cancelAnimationFrame(animationId)

  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('tank', score.value)
  }
}

async function goBack() {
  cancelAnimationFrame(animationId)
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    try {
      await submitScore('tank', score.value)
    } catch (e) {
      console.error('提交分数失败:', e)
    }
  }
  router.push({ path: '/home' })
}

function gameLoop(currentTime = performance.now()) {
  if (!isRunning.value || isPaused.value || gameOver.value || showLevelComplete.value) return

  tankGame.update(currentTime)
  draw()

  animationId = requestAnimationFrame(gameLoop)
}

function draw() {
  if (!ctx || !tankGame) return
  tankGame.render(ctx, canvasWidth.value, canvasHeight.value)
}

function handleKeydown(e) {
  if (!tankGame) return

  tankGame.handleKeyDown(e.code)

  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault()
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault()
    if (isRunning.value && !gameOver.value && !showLevelComplete.value) {
      togglePause()
    }
  }
  if (e.code === 'KeyR') {
    e.preventDefault()
    resetGame()
  }
}

function handleKeyup(e) {
  if (!tankGame) return
  tankGame.handleKeyUp(e.code)
}

function handleDirStart(dir) {
  if (!tankGame || !isRunning.value || isPaused.value) return
  const dirMap = {
    'up': DIRECTION.UP,
    'down': DIRECTION.DOWN,
    'left': DIRECTION.LEFT,
    'right': DIRECTION.RIGHT
  }
  tankGame.handleDirectionPress(dirMap[dir])
}

function handleDirEnd() {
  if (!tankGame) return
  tankGame.handleDirectionRelease()
}

function handleFire() {
  if (!tankGame || !isRunning.value || isPaused.value) return
  tankGame.handleFirePress()
}

function resizeCanvas() {
  const screenWidth = Math.min(window.innerWidth - 40, 420)
  canvasWidth.value = screenWidth
  canvasHeight.value = screenWidth + 60

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
  window.addEventListener('keyup', handleKeyup)
  window.addEventListener('resize', () => {
    nextTick(() => {
      resizeCanvas()
      draw()
    })
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-tank {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
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
  padding: 12px 16px;
}

.back-btn,
.reset-btn {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.reset-btn {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
}

.back-btn:active,
.reset-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.25);
}

.game-title {
  font-size: 20px;
  font-weight: 800;
  color: white;
}

.status-bar {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
  width: 100%;
}

.status-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 8px 10px;
  text-align: center;
  color: white;
}

.status-label {
  font-size: 10px;
  opacity: 0.7;
}

.status-value {
  font-size: 16px;
  font-weight: 700;
}

.status-value.level {
  color: #fbbf24;
  font-size: 18px;
}

.status-value.lives {
  color: #ef4444;
}

.game-canvas-wrapper {
  padding: 0;
  position: relative;
}

.game-canvas {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  touch-action: none;
  user-select: none;
}

.game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.overlay-content {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 30px 40px;
  text-align: center;
  color: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.overlay-title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 12px;
  color: #fbbf24;
}

.overlay-title.gameover {
  color: #ef4444;
}

.overlay-score {
  font-size: 18px;
  margin-bottom: 8px;
}

.overlay-level {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 20px;
}

.overlay-bonus {
  font-size: 16px;
  color: #22c55e;
  margin-bottom: 16px;
}

.overlay-desc {
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.8;
  margin-bottom: 20px;
}

.overlay-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  padding: 12px 36px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.overlay-btn.start {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.overlay-btn:active {
  transform: scale(0.95);
}

.control-panel {
  margin-top: 12px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  border-radius: 25px;
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.pause-btn {
  background: linear-gradient(135deg, #ffa751 0%, #ffe259 100%);
  color: #78350f;
  box-shadow: 0 4px 15px rgba(255, 167, 81, 0.4);
}

.control-btn:active {
  transform: scale(0.95);
}

.mobile-controls {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 20px;
  z-index: 50;
  pointer-events: none;
}

.direction-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.dir-row {
  display: flex;
  gap: 4px;
}

.dir-btn {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dir-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.9);
}

.dir-center {
  width: 56px;
  height: 56px;
}

.fire-btn-wrap {
  pointer-events: auto;
}

.fire-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
  font-size: 12px;
  font-weight: 700;
  gap: 2px;
}

.fire-btn:active {
  transform: scale(0.9);
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.4);
}
</style>
