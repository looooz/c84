<template>
  <div class="page-container game-link" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </button>
      <div class="game-title">🎴 连连看</div>
      <button class="reset-btn" @click="resetGame">
        重置
      </button>
    </div>

    <div class="theme-selector" v-if="!isRunning && !gameOver && !showLevelComplete">
      <div class="theme-label">选择主题：</div>
      <div class="theme-options">
        <button 
          v-for="theme in patternThemes" 
          :key="theme.id"
          class="theme-btn"
          :class="{ active: currentTheme === theme.id }"
          @click="currentTheme = theme.id; initBoard()"
        >
          <span class="theme-icon">{{ theme.preview }}</span>
          <span class="theme-name">{{ theme.name }}</span>
        </button>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">第</span>
        <span class="status-value level">{{ level }}</span>
        <span class="status-label">关</span>
      </div>
      <div class="status-item">
        <span class="status-label">分数</span>
        <span class="status-value">{{ score }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">剩余</span>
        <span class="status-value">{{ remainingPairs }}</span>
      </div>
    </div>

    <div class="time-bar-container" v-if="timeLimit > 0">
      <div class="time-bar-label">
        <el-icon :size="14"><Timer /></el-icon>
        <span>{{ timeLeft }}s</span>
      </div>
      <div class="time-bar">
        <div 
          class="time-bar-fill" 
          :style="{ width: (timeLeft / timeLimit * 100) + '%' }"
          :class="{ danger: timeLeft <= 10, warning: timeLeft > 10 && timeLeft <= 30 }"
        ></div>
      </div>
    </div>

    <div class="game-canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        @touchstart.prevent="handleTouchStart"
        @touchend.prevent="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
      ></canvas>
    </div>

    <div class="game-overlay" v-if="showLevelComplete">
      <div class="overlay-content">
        <div class="overlay-title">🎉 关卡完成！</div>
        <div class="overlay-score">得分：{{ score }}</div>
        <div class="overlay-bonus">关卡奖励：+{{ levelBonus }}分</div>
        <button class="overlay-btn" @click="nextLevel">下一关</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="game-overlay" v-if="showNoMoves">
      <div class="overlay-content">
        <div class="overlay-title">🔄 自动重排</div>
        <div class="overlay-desc">当前没有可消除的方块，正在重新排列...</div>
      </div>
    </div>

    <div class="game-overlay" v-if="gameOver">
      <div class="overlay-content">
        <div class="overlay-title gameover">💀 游戏结束</div>
        <div class="overlay-score">最终得分：{{ score }}</div>
        <div class="overlay-level">到达关卡：第 {{ level }} 关</div>
        <button class="overlay-btn" @click="resetGame">重新开始</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="game-overlay" v-if="!isRunning && !gameOver && !showLevelComplete && !showNoMoves && level === 1 && score === 0">
      <div class="overlay-content">
        <div class="overlay-title">🎴 连连看</div>
        <div class="overlay-desc">点击两个相同图案，若它们之间能用不超过两个拐点的直线连通，即可消除。<br/><br/>消除所有方块进入下一关！</div>
        <button class="overlay-btn start" @click="startGame">开始游戏</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="control-panel" v-if="isRunning">
      <button class="control-btn theme-btn-inline" @click="showThemeSelector = true">
        <el-icon :size="18"><Picture /></el-icon>
        <span>主题</span>
      </button>
      <button class="control-btn shuffle-btn" @click="shuffleBoard">
        <el-icon :size="18"><Refresh /></el-icon>
        <span>重排 ({{ shuffleCount }})</span>
      </button>
      <button class="control-btn hint-btn" @click="showHint">
        <el-icon :size="18"><View /></el-icon>
        <span>提示 ({{ hintCount }})</span>
      </button>
      <button class="control-btn pause-btn" @click="toggleGame">
        <el-icon :size="18"><Pause /></el-icon>
        <span>暂停</span>
      </button>
    </div>

    <div class="control-panel" v-if="!isRunning && !gameOver && !showLevelComplete && !showNoMoves && (level > 1 || score > 0)">
      <button class="control-btn start-btn" @click="toggleGame">
        <el-icon :size="18"><VideoPlay /></el-icon>
        <span>继续</span>
      </button>
    </div>

    <div class="theme-modal" v-if="showThemeSelector" @click.self="showThemeSelector = false">
      <div class="theme-modal-content">
        <div class="theme-modal-title">选择图案主题</div>
        <div class="theme-modal-grid">
          <button 
            v-for="theme in patternThemes" 
            :key="theme.id"
            class="theme-modal-btn"
            :class="{ active: currentTheme === theme.id }"
            @click="changeTheme(theme.id)"
          >
            <div class="theme-modal-preview">{{ theme.preview }}</div>
            <div class="theme-modal-name">{{ theme.name }}</div>
            <div class="theme-modal-sample">
              <span v-for="(icon, i) in theme.icons.slice(0, 4)" :key="i">{{ icon }}</span>
            </div>
          </button>
        </div>
        <button class="theme-modal-close" @click="showThemeSelector = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const pageRef = ref(null)
const canvasRef = ref(null)

const submitScore = inject('submitScore')
const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const patternThemes = [
  {
    id: 'fruits',
    name: '水果',
    preview: '🍎',
    icons: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝', '🍍', '🥭', '🍐', '🥥', '🍌', '🫐', '🍈', '🍏', '🍊', '🥑', '🍆', '🌽', '🥕', '🥒', '🥬', '🥦', '🧄', '🧅', '🥔', '🍠', '🥯', '🥨', '🧀']
  },
  {
    id: 'animals',
    name: '动物',
    preview: '🐶',
    icons: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🦗']
  },
  {
    id: 'food',
    name: '食物',
    preview: '🍔',
    icons: ['🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍗', '🍖', '🥩', '🍤', '🍣', '🍱', '🥟', '🍜', '🍝', '🍛', '🍚', '🍙', '🍘', '🥮', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍯', '🍩', '🍪']
  },
  {
    id: 'mahjong',
    name: '麻将',
    preview: '🀇',
    icons: ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏', '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘', '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡', '🀀', '🀁', '🀂', '🀃', '🀄']
  },
  {
    id: 'emoji',
    name: '表情',
    preview: '😀',
    icons: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '🤪', '😜', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶']
  },
  {
    id: 'shapes',
    name: '形状',
    preview: '⭐',
    icons: ['⭐', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈', '❤️', '💜', '💙', '💚', '💛', '🧡', '🖤', '🤍', '💯', '✅', '❌', '⭕', '🔺', '🔻', '🔷', '🔶', '🔹', '🔸', '▪️', '▫️', '🔳', '🔲', '🔵', '🟢']
  },
  {
    id: 'sports',
    name: '运动',
    preview: '⚽',
    icons: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥅', '🏏', '🥍', '🏀', '⛳', '🎣', '🤿', '🥊', '🥋', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🏹', '🎱', '🎮', '🕹️']
  },
  {
    id: 'nature',
    name: '自然',
    preview: '🌸',
    icons: ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌵', '🎄', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌍', '🌎', '🌏', '🌙', '☀️', '⭐', '⛅', '🌈', '❄️', '💨', '🌊', '💧', '🔥']
  }
]

const PATTERN_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#a855f7', '#22c55e', '#ec4899', '#f472b6', '#dc2626',
  '#84cc16', '#f59e0b', '#fb923c', '#10b981', '#a78bfa', '#fde047', '#6366f1', '#14b8a6',
  '#facc15', '#818cf8', '#f97316', '#eab308', '#ef4444', '#3b82f6', '#06b6d4', '#a855f7',
  '#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#1f2937', '#f3f4f6'
]

const level = ref(1)
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)
const showLevelComplete = ref(false)
const showNoMoves = ref(false)
const levelBonus = ref(0)
const shuffleCount = ref(3)
const hintCount = ref(3)
const timeLeft = ref(0)
const timeLimit = ref(0)
const currentTheme = ref('fruits')
const showThemeSelector = ref(false)

const canvasWidth = ref(360)
const canvasHeight = ref(480)
const remainingCount = ref(0)

let ctx = null
let animationId = null
let scoreSubmitted = false

let cols = 0
let rows = 0
let cellSize = 40
let cellPadding = 4
let board = []
let selectedCell = null
let hintPair = null
let hintTimer = 0
let matchedPath = null
let matchedPathTimer = 0
let timerInterval = null

const currentPatternIcons = computed(() => {
  const theme = patternThemes.find(t => t.id === currentTheme.value)
  return theme ? theme.icons : patternThemes[0].icons
})

const remainingPairs = computed(() => {
  return Math.floor(remainingCount.value / 2)
})

function getLevelConfig(lvl) {
  const baseCols = 6
  const baseRows = 6
  const colIncrement = Math.floor((lvl - 1) / 3)
  const rowIncrement = Math.floor((lvl - 1) / 2)
  let newCols = Math.min(baseCols + colIncrement, 10)
  let newRows = Math.min(baseRows + rowIncrement, 12)
  
  if ((newCols * newRows) % 2 !== 0) {
    if (newRows > newCols && newRows > 6) {
      newRows--
    } else if (newCols > 6) {
      newCols--
    } else {
      newRows++
    }
  }
  
  const patternTypes = Math.min(6 + lvl, 32)
  const time = lvl >= 1 ? Math.max(40, 120 - (lvl - 1) * 8) : 0
  
  return { cols: newCols, rows: newRows, patternTypes, time }
}

function resizeCanvas() {
  const screenWidth = Math.min(window.innerWidth - 20, 420)
  const config = getLevelConfig(level.value)
  const aspectRatio = config.rows / config.cols
  
  let w = screenWidth
  let h = screenWidth * aspectRatio
  
  if (h > 480) {
    h = 480
    w = h / aspectRatio
  }
  
  canvasWidth.value = Math.floor(w)
  canvasHeight.value = Math.floor(h)
  
  cols = config.cols
  rows = config.rows
  cellSize = Math.floor(Math.min(canvasWidth.value / cols, canvasHeight.value / rows))
  cellPadding = Math.max(2, Math.floor(cellSize * 0.1))
  
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

function initBoard() {
  const config = getLevelConfig(level.value)
  const totalCells = config.cols * config.rows
  const pairs = Math.floor(totalCells / 2)
  
  const patterns = []
  for (let i = 0; i < pairs; i++) {
    const patternId = (i % config.patternTypes) + 1
    patterns.push(patternId, patternId)
  }
  
  for (let i = patterns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[patterns[i], patterns[j]] = [patterns[j], patterns[i]]
  }
  
  board = []
  let count = 0
  for (let r = 0; r < config.rows; r++) {
    board[r] = reactive([])
    for (let c = 0; c < config.cols; c++) {
      const idx = r * config.cols + c
      const patternId = patterns[idx] || 0
      if (patternId !== 0) count++
      board[r][c] = reactive({
        patternId: patternId,
        x: c,
        y: r,
        removing: false,
        removeProgress: 0
      })
    }
  }
  
  cols = config.cols
  rows = config.rows
  remainingCount.value = count
  
  if (!hasValidMoves()) {
    shuffleBoardInternal()
  }
}

function updateRemainingCount() {
  let count = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r] && board[r][c] && board[r][c].patternId !== 0) {
        count++
      }
    }
  }
  remainingCount.value = count
}

function isBlocked(r, c) {
  if (r < -1 || r > rows || c < -1 || c > cols) return true
  if (r === -1 || r === rows || c === -1 || c === cols) return false
  if (!board[r] || !board[r][c]) return true
  return board[r][c].patternId !== 0
}

function canConnectStraight(r1, c1, r2, c2) {
  if (r1 === r2) {
    const minC = Math.min(c1, c2)
    const maxC = Math.max(c1, c2)
    for (let c = minC + 1; c < maxC; c++) {
      if (isBlocked(r1, c)) return false
    }
    return true
  }
  if (c1 === c2) {
    const minR = Math.min(r1, r2)
    const maxR = Math.max(r1, r2)
    for (let r = minR + 1; r < maxR; r++) {
      if (isBlocked(r, c1)) return false
    }
    return true
  }
  return false
}

function findPath(r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return null
  if (!board[r1] || !board[r1][c1] || !board[r2] || !board[r2][c2]) return null
  if (board[r1][c1].patternId !== board[r2][c2].patternId) return null
  if (board[r1][c1].patternId === 0) return null
  
  const temp1 = board[r1][c1].patternId
  const temp2 = board[r2][c2].patternId
  board[r1][c1].patternId = 0
  board[r2][c2].patternId = 0
  
  let result = null
  
  if (canConnectStraight(r1, c1, r2, c2)) {
    result = [{ r: r1, c: c1 }, { r: r2, c: c2 }]
  }
  
  if (!result) {
    for (let c = -1; c <= cols; c++) {
      if (c === c1 || c === c2) continue
      if (!isBlocked(r1, c) && !isBlocked(r2, c)) {
        if (canConnectStraight(r1, c1, r1, c) &&
            canConnectStraight(r1, c, r2, c) &&
            canConnectStraight(r2, c, r2, c2)) {
          result = [{ r: r1, c: c1 }, { r: r1, c }, { r: r2, c }, { r: r2, c: c2 }]
          break
        }
      }
    }
  }
  
  if (!result) {
    for (let r = -1; r <= rows; r++) {
      if (r === r1 || r === r2) continue
      if (!isBlocked(r, c1) && !isBlocked(r, c2)) {
        if (canConnectStraight(r1, c1, r, c1) &&
            canConnectStraight(r, c1, r, c2) &&
            canConnectStraight(r, c2, r2, c2)) {
          result = [{ r: r1, c: c1 }, { r, c: c1 }, { r, c: c2 }, { r: r2, c: c2 }]
          break
        }
      }
    }
  }
  
  if (!result) {
    for (let r = -1; r <= rows && !result; r++) {
      for (let c = -1; c <= cols && !result; c++) {
        if (r === r1 && c === c1) continue
        if (r === r2 && c === c2) continue
        if (isBlocked(r, c)) continue
        
        if (canConnectStraight(r1, c1, r, c) && canConnectStraight(r, c, r2, c2)) {
          if ((r === r1 || c === c1) && (r === r2 || c === c2)) {
            const path = [{ r: r1, c: c1 }]
            if (r !== r1 || c !== c1) path.push({ r, c })
            if (r !== r2 || c !== c2) path.push({ r: r2, c: c2 })
            if (path.length <= 4) {
              result = path
            }
          }
        }
      }
    }
  }
  
  if (!result) {
    for (let rm = -1; rm <= rows && !result; rm++) {
      for (let cm = -1; cm <= cols && !result; cm++) {
        if (isBlocked(rm, cm)) continue
        for (let rn = -1; rn <= rows && !result; rn++) {
          for (let cn = -1; cn <= cols && !result; cn++) {
            if (isBlocked(rn, cn)) continue
            
            const ok1 = canConnectStraight(r1, c1, rm, cm)
            const ok2 = (rm === rn || cm === cn) && canConnectStraight(rm, cm, rn, cn)
            const ok3 = canConnectStraight(rn, cn, r2, c2)
            
            if (ok1 && ok2 && ok3) {
              const path = [{ r: r1, c: c1 }]
              if (rm !== r1 || cm !== c1) path.push({ r: rm, c: cm })
              if (rn !== rm || cn !== cm) path.push({ r: rn, c: cn })
              if (rn !== r2 || cn !== c2) path.push({ r: r2, c: c2 })
              if (path.length <= 4) {
                result = path
              }
            }
          }
        }
      }
    }
  }
  
  board[r1][c1].patternId = temp1
  board[r2][c2].patternId = temp2
  
  return result
}

function hasValidMoves() {
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].patternId !== 0) {
        cells.push({ r, c, id: board[r][c].patternId })
      }
    }
  }
  
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].id === cells[j].id) {
        if (findPath(cells[i].r, cells[i].c, cells[j].r, cells[j].c)) {
          return true
        }
      }
    }
  }
  return false
}

function findHintPair() {
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].patternId !== 0) {
        cells.push({ r, c, id: board[r][c].patternId })
      }
    }
  }
  
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].id === cells[j].id) {
        if (findPath(cells[i].r, cells[i].c, cells[j].r, cells[j].c)) {
          return { r1: cells[i].r, c1: cells[i].c, r2: cells[j].r, c2: cells[j].c }
        }
      }
    }
  }
  return null
}

function shuffleBoardInternal() {
  const patterns = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].patternId !== 0) {
        patterns.push(board[r][c].patternId)
      }
    }
  }
  
  let attempts = 0
  do {
    for (let i = patterns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[patterns[i], patterns[j]] = [patterns[j], patterns[i]]
    }
    
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].patternId !== 0) {
          board[r][c].patternId = patterns[idx++]
        }
      }
    }
    attempts++
  } while (!hasValidMoves() && attempts < 50)
  
  updateRemainingCount()
}

function shuffleBoard() {
  if (shuffleCount.value <= 0 || !isRunning.value) return
  shuffleCount.value--
  shuffleBoardInternal()
  selectedCell = null
  hintPair = null
  draw()
}

function checkAndAutoShuffle() {
  if (!hasValidMoves() && remainingCount.value > 0) {
    showNoMoves.value = true
    isRunning.value = false
    stopTimer()
    
    setTimeout(() => {
      shuffleBoardInternal()
      showNoMoves.value = false
      isRunning.value = true
      startTimer()
      gameLoop()
      draw()
    }, 1500)
    return true
  }
  return false
}

function showHint() {
  if (hintCount.value <= 0 || !isRunning.value) return
  const pair = findHintPair()
  if (pair) {
    hintCount.value--
    hintPair = pair
    hintTimer = 180
    draw()
  }
}

function getCellFromEvent(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  let clientX, clientY
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  const x = clientX - rect.left
  const y = clientY - rect.top
  
  const c = Math.floor(x / cellSize)
  const r = Math.floor(y / cellSize)
  
  if (r >= 0 && r < rows && c >= 0 && c < cols) {
    return { r, c }
  }
  return null
}

function handleSelect(r, c) {
  if (!isRunning.value || !board[r] || !board[r][c]) return
  if (board[r][c].patternId === 0) return
  
  if (!selectedCell) {
    selectedCell = { r, c }
    draw()
    return
  }
  
  if (selectedCell.r === r && selectedCell.c === c) {
    selectedCell = null
    draw()
    return
  }
  
  const path = findPath(selectedCell.r, selectedCell.c, r, c)
  if (path) {
    matchedPath = path
    matchedPathTimer = 30
    
    board[selectedCell.r][selectedCell.c].removing = true
    board[r][c].removing = true
    board[selectedCell.r][selectedCell.c].removeProgress = 0
    board[r][c].removeProgress = 0
    
    const pairScore = 10 * level.value
    score.value += pairScore
    
    selectedCell = null
    hintPair = null
    
    draw()
    
    setTimeout(() => {
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          if (board[rr][cc].removing) {
            board[rr][cc].patternId = 0
            board[rr][cc].removing = false
          }
        }
      }
      matchedPath = null
      updateRemainingCount()
      draw()
      
      if (remainingCount.value === 0) {
        completeLevel()
      } else {
        checkAndAutoShuffle()
      }
    }, 400)
  } else {
    selectedCell = { r, c }
    draw()
  }
}

function handleTouchStart(e) {
  const cell = getCellFromEvent(e)
  if (cell) handleSelect(cell.r, cell.c)
}

function handleTouchEnd(e) {}

function handleMouseDown(e) {
  const cell = getCellFromEvent(e)
  if (cell) handleSelect(cell.r, cell.c)
}

function handleMouseUp(e) {}

function drawCell(r, c, isSelected = false, isHint = false) {
  const cell = board[r][c]
  if (!cell || cell.patternId === 0) return
  
  const x = c * cellSize + cellPadding
  const y = r * cellSize + cellPadding
  const size = cellSize - cellPadding * 2
  
  let scale = 1
  let alpha = 1
  if (cell.removing) {
    cell.removeProgress = Math.min(1, (cell.removeProgress || 0) + 0.08)
    scale = 1 - cell.removeProgress * 0.8
    alpha = 1 - cell.removeProgress
  }
  
  const drawX = x + size / 2
  const drawY = y + size / 2
  const drawSize = size * scale
  
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(drawX, drawY)
  
  const patternId = cell.patternId
  const color = PATTERN_COLORS[(patternId - 1) % PATTERN_COLORS.length]
  const icons = currentPatternIcons.value
  const icon = icons[(patternId - 1) % icons.length]
  
  ctx.shadowColor = color
  ctx.shadowBlur = isSelected || isHint ? 15 : 6
  
  const gradient = ctx.createLinearGradient(-drawSize/2, -drawSize/2, drawSize/2, drawSize/2)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.5, color)
  gradient.addColorStop(1, color)
  
  ctx.fillStyle = gradient
  const radius = drawSize * 0.18
  roundRect(-drawSize/2, -drawSize/2, drawSize, drawSize, radius)
  ctx.fill()
  
  if (isSelected) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    roundRect(-drawSize/2, -drawSize/2, drawSize, drawSize, radius)
    ctx.stroke()
  } else if (isHint) {
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 3
    ctx.setLineDash([4, 4])
    roundRect(-drawSize/2, -drawSize/2, drawSize, drawSize, radius)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    roundRect(-drawSize/2, -drawSize/2, drawSize, drawSize, radius)
    ctx.stroke()
  }
  
  ctx.shadowBlur = 0
  ctx.font = `${drawSize * 0.58}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(icon, 0, 2)
  
  ctx.restore()
}

function roundRect(x, y, w, h, r) {
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

function drawPath() {
  if (!matchedPath || matchedPath.length < 2) return
  
  ctx.save()
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = '#22c55e'
  ctx.shadowBlur = 10
  
  const padding = 4
  const halfCell = cellSize / 2 - padding
  
  function getEdgePoint(fromR, fromC, toR, toC) {
    const fromX = fromC * cellSize + cellSize / 2
    const fromY = fromR * cellSize + cellSize / 2
    const toX = toC * cellSize + cellSize / 2
    const toY = toR * cellSize + cellSize / 2
    
    const dx = toX - fromX
    const dy = toY - fromY
    
    if (Math.abs(dx) > Math.abs(dy)) {
      const t = halfCell / Math.abs(dx)
      return { x: fromX + dx * t, y: fromY + dy * t }
    } else {
      const t = halfCell / Math.abs(dy || 1)
      return { x: fromX + dx * t, y: fromY + dy * t }
    }
  }
  
  ctx.beginPath()
  for (let i = 0; i < matchedPath.length; i++) {
    const p = matchedPath[i]
    const clampedR = Math.max(0, Math.min(rows - 1, p.r))
    const clampedC = Math.max(0, Math.min(cols - 1, p.c))
    const centerX = clampedC * cellSize + cellSize / 2
    const centerY = clampedR * cellSize + cellSize / 2
    
    let x, y
    
    if (i === 0 && matchedPath.length > 1) {
      const nextP = matchedPath[1]
      const ep = getEdgePoint(clampedR, clampedC, 
        Math.max(0, Math.min(rows - 1, nextP.r)), 
        Math.max(0, Math.min(cols - 1, nextP.c)))
      x = ep.x
      y = ep.y
    } else if (i === matchedPath.length - 1 && matchedPath.length > 1) {
      const prevP = matchedPath[i - 1]
      const ep = getEdgePoint(clampedR, clampedC,
        Math.max(0, Math.min(rows - 1, prevP.r)),
        Math.max(0, Math.min(cols - 1, prevP.c)))
      x = ep.x
      y = ep.y
    } else {
      x = centerX
      y = centerY
    }
    
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

function draw() {
  if (!ctx) return
  
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight.value)
  bgGradient.addColorStop(0, '#1e1b4b')
  bgGradient.addColorStop(1, '#0f0a2e')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.fillStyle = 'rgba(255,255,255,0.02)'
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c
      const isHint = hintPair && ((hintPair.r1 === r && hintPair.c1 === c) || (hintPair.r2 === r && hintPair.c2 === c))
      drawCell(r, c, isSelected, isHint)
    }
  }
  
  if (hintTimer > 0) {
    hintTimer--
    if (hintTimer <= 0) hintPair = null
  }
  
  if (matchedPath) {
    drawPath()
  }
}

function gameLoop() {
  if (!isRunning.value) return
  
  let needsRedraw = false
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] && board[r][c].removing && board[r][c].removeProgress < 1) {
        needsRedraw = true
      }
    }
  }
  
  if (matchedPathTimer > 0) {
    matchedPathTimer--
    if (matchedPathTimer <= 0) matchedPath = null
    needsRedraw = true
  }
  
  if (needsRedraw) draw()
  
  animationId = requestAnimationFrame(gameLoop)
}

function initGame() {
  level.value = 1
  score.value = 0
  gameOver.value = false
  showLevelComplete.value = false
  showNoMoves.value = false
  isRunning.value = false
  scoreSubmitted = false
  shuffleCount.value = 3
  hintCount.value = 3
  
  resizeCanvas()
  initBoard()
  selectedCell = null
  hintPair = null
  matchedPath = null
  
  const config = getLevelConfig(level.value)
  timeLimit.value = config.time
  timeLeft.value = config.time
  
  draw()
}

function startGame() {
  isRunning.value = true
  startTimer()
  gameLoop()
}

function startTimer() {
  stopTimer()
  if (timeLimit.value > 0) {
    timerInterval = setInterval(() => {
      if (isRunning.value) {
        timeLeft.value--
        if (timeLeft.value <= 0) {
          endGame()
        }
      }
    }, 1000)
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function toggleGame() {
  isRunning.value = !isRunning.value
  if (isRunning.value) {
    startTimer()
    gameLoop()
  } else {
    stopTimer()
  }
}

function completeLevel() {
  showLevelComplete.value = true
  isRunning.value = false
  stopTimer()
  levelBonus.value = level.value * 100 + (timeLimit.value > 0 ? timeLeft.value * 5 : 0)
  score.value += levelBonus.value
}

function nextLevel() {
  showLevelComplete.value = false
  level.value++
  shuffleCount.value = Math.min(shuffleCount.value + 1, 5)
  hintCount.value = Math.min(hintCount.value + 1, 5)
  
  resizeCanvas()
  initBoard()
  selectedCell = null
  hintPair = null
  matchedPath = null
  
  const config = getLevelConfig(level.value)
  timeLimit.value = config.time
  timeLeft.value = config.time
  
  isRunning.value = true
  startTimer()
  gameLoop()
}

function endGame() {
  gameOver.value = true
  isRunning.value = false
  stopTimer()
  handleGameOver()
}

async function handleGameOver() {
  if (!scoreSubmitted && score.value > 0) {
    scoreSubmitted = true
    await submitScore('link', score.value)
  }
}

function resetGame() {
  stopTimer()
  initGame()
}

function changeTheme(themeId) {
  currentTheme.value = themeId
  showThemeSelector.value = false
  if (board && board.length > 0) {
    draw()
  }
}

async function goBack() {
  stopTimer()
  if (!gameOver.value && score.value > 0 && !scoreSubmitted) {
    scoreSubmitted = true
    try {
      await submitScore('link', score.value)
    } catch (e) {
      console.error('提交分数失败:', e)
    }
  }
  router.push({ path: '/home' })
}

function handleResize() {
  nextTick(() => {
    resizeCanvas()
    draw()
  })
}

onMounted(() => {
  loadHighScores()
  nextTick(() => {
    initGame()
  })
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopTimer()
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.game-link {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  min-height: 100vh;
}

.game-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.back-btn,
.reset-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.reset-btn {
  width: auto;
  padding: 0 16px;
  border-radius: 22px;
  font-weight: 600;
  font-size: 14px;
  gap: 4px;
}

.back-btn:active,
.reset-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.25);
}

.game-title {
  font-size: 24px;
  font-weight: 800;
  color: white;
  letter-spacing: 2px;
}

.theme-selector {
  width: 100%;
  padding: 0 20px 8px;
}

.theme-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.theme-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn.active {
  background: rgba(139, 92, 246, 0.4);
  border-color: rgba(139, 92, 246, 0.6);
  color: white;
}

.theme-btn:active {
  transform: scale(0.95);
}

.theme-icon {
  font-size: 16px;
}

.status-bar {
  display: flex;
  gap: 12px;
  padding: 0 20px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.status-item {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(10px);
}

.status-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.status-value {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.status-value.level {
  color: #fbbf24;
}

.time-bar-container {
  width: 90%;
  max-width: 400px;
  margin-bottom: 10px;
}

.time-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.time-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.time-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  border-radius: 5px;
  transition: width 1s linear, background-color 0.3s ease;
}

.time-bar-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.time-bar-fill.danger {
  background: linear-gradient(90deg, #dc2626, #ef4444);
  animation: timePulse 0.5s infinite;
}

@keyframes timePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.game-canvas-wrapper {
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin: 8px 0;
}

.game-canvas {
  display: block;
  border-radius: 12px;
}

.game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.overlay-content {
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
  border-radius: 24px;
  padding: 32px 28px;
  text-align: center;
  color: white;
  max-width: 320px;
  width: 85%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.overlay-title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 12px;
}

.overlay-title.gameover {
  color: #fca5a5;
}

.overlay-desc {
  font-size: 14px;
  opacity: 0.85;
  line-height: 1.6;
  margin-bottom: 20px;
}

.overlay-score {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.overlay-bonus {
  font-size: 16px;
  color: #fbbf24;
  margin-bottom: 20px;
}

.overlay-level {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 20px;
}

.overlay-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
  padding: 12px 36px;
  border-radius: 28px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
}

.overlay-btn.start {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
  color: white;
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

.control-panel {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 22px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.theme-btn-inline {
  background: rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
  border: 1px solid rgba(139, 92, 246, 0.4);
}

.shuffle-btn {
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.hint-btn {
  background: rgba(251, 191, 36, 0.3);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.pause-btn,
.start-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-btn:active {
  transform: scale(0.95);
}

.theme-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(10px);
}

.theme-modal-content {
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
  border-radius: 24px;
  padding: 24px 20px;
  width: 90%;
  max-width: 360px;
  max-height: 80vh;
  overflow-y: auto;
}

.theme-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: white;
  text-align: center;
  margin-bottom: 16px;
}

.theme-modal-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.theme-modal-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 14px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.theme-modal-btn.active {
  background: rgba(139, 92, 246, 0.4);
  border-color: #a78bfa;
  transform: scale(1.02);
}

.theme-modal-preview {
  font-size: 36px;
  margin-bottom: 4px;
}

.theme-modal-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 6px;
}

.theme-modal-sample {
  font-size: 16px;
  opacity: 0.9;
  display: flex;
  gap: 4px;
  justify-content: center;
}

.theme-modal-close {
  width: 100%;
  padding: 12px;
  border-radius: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-modal-close:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.3);
}
</style>
