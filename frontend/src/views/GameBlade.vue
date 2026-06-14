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

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">第</span>
        <span class="status-value level">{{ level }}</span>
        <span class="status-label">关</span>
      </div>
      <div class="status-item wave-item">
        <span class="status-label">波次</span>
        <span class="status-value">{{ currentWave }}/{{ totalWaves }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">得分</span>
        <span class="status-value">{{ score }}</span>
      </div>
    </div>

    <div class="mission-bar">
      <div class="mission-text">📋 {{ missionText }}</div>
      <div class="mission-progress-wrap">
        <div class="mission-progress" :style="{ width: missionProgress + '%' }"></div>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-icon">⚔️</div>
        <div class="stat-info">
          <div class="stat-label">刀数</div>
          <div class="stat-value">{{ bladeCount }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">💨</div>
        <div class="stat-info">
          <div class="stat-label">转速</div>
          <div class="stat-value">{{ Math.round(bladeSpeed * 100) }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">📏</div>
        <div class="stat-info">
          <div class="stat-label">范围</div>
          <div class="stat-value">{{ Math.round(bladeRadius + bladeLength) }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">❤️</div>
        <div class="stat-info">
          <div class="stat-label">生命</div>
          <div class="stat-value">{{ playerHp }}</div>
        </div>
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

    <div class="game-overlay" v-if="showLevelComplete">
      <div class="overlay-content">
        <div class="overlay-title">🎉 关卡完成！</div>
        <div class="overlay-score">得分：{{ score }}</div>
        <div class="overlay-bonus" v-if="levelBonus">关卡奖励：+{{ levelBonus }}分</div>
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

    <div class="game-overlay" v-if="!isRunning && !gameOver && !showLevelComplete && level === 1 && score === 0">
      <div class="overlay-content">
        <div class="overlay-title">⚔️ 转刀割草</div>
        <div class="overlay-desc">拖动控制移动，用旋转的刀消灭敌人！<br/>收集道具增强实力，击败BOSS通过关卡。</div>
        <button class="overlay-btn start" @click="startGame">开始游戏</button>
      </div>
    </div>

    <div class="buff-bar" v-if="activeBuffs.length > 0">
      <div class="buff-item" v-for="buff in activeBuffs" :key="buff.type">
        <span class="buff-icon">{{ buff.icon }}</span>
        <span class="buff-name">{{ buff.name }}</span>
      </div>
    </div>

    <div class="control-panel" v-if="isRunning">
      <button class="control-btn pause-btn" @click="toggleGame">
        <el-icon :size="20"><Pause /></el-icon>
        <span>暂停</span>
      </button>
    </div>

    <div class="control-panel" v-if="!isRunning && !gameOver && !showLevelComplete && (level > 1 || score > 0)">
      <button class="control-btn start-btn" @click="toggleGame">
        <el-icon :size="20"><VideoPlay /></el-icon>
        <span>继续</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const pageRef = ref(null)
const canvasRef = ref(null)

const submitScore = inject('submitScore')
const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const canvasWidth = ref(360)
const canvasHeight = ref(520)
const score = ref(0)
const gameOver = ref(false)
const isRunning = ref(false)
const showLevelComplete = ref(false)
const levelBonus = ref(0)

const level = ref(1)
const currentWave = ref(1)
const totalWaves = ref(3)
const waveEnemiesKilled = ref(0)
const waveEnemiesTotal = ref(10)

const bladeCount = ref(1)
const bladeSpeed = ref(0.05)
const bladeRadius = ref(60)
const bladeLength = ref(40)
const bladeDamage = ref(1)
const playerHp = ref(3)
const playerSpeed = ref(1)

const missionText = computed(() => {
  if (bossSpawned && bossAlive) {
    return '击败BOSS！'
  }
  return `消灭敌人 (${waveEnemiesKilled.value}/${waveEnemiesTotal.value})`
})

const missionProgress = computed(() => {
  if (bossSpawned && bossAlive) {
    return Math.round((1 - bossHp / bossMaxHp) * 100)
  }
  return Math.min(100, Math.round((waveEnemiesKilled.value / waveEnemiesTotal.value) * 100))
})

const activeBuffs = computed(() => {
  const buffs = []
  if (bladeCount.value > 1) buffs.push({ type: 'blade', icon: '⚔️', name: `x${bladeCount.value}` })
  if (bladeSpeed.value > 0.05) buffs.push({ type: 'speed', icon: '💨', name: '加速' })
  if (bladeDamage.value > 1) buffs.push({ type: 'damage', icon: '💥', name: `x${bladeDamage.value}` })
  if (bladeRadius.value > 60) buffs.push({ type: 'range', icon: '📏', name: '范围' })
  if (playerSpeed.value > 1) buffs.push({ type: 'movespeed', icon: '👟', name: '移速' })
  return buffs
})

let ctx = null
let animationId = null
let scoreSubmitted = false

let player = { x: 0, y: 0, radius: 20 }
let blades = []
let bladeAngle = 0
let bladeWidth = 6

let enemies = []
let enemySpawnTimer = 0
let enemySpawnInterval = 90

let boss = null
let bossSpawned = false
let bossAlive = false
let bossHp = 0
let bossMaxHp = 0

let obstacles = []
let chests = []
let grassPatches = []

let powerups = []
let powerupSpawnTimer = 0

let particles = []
let damageTexts = []

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let playerStartX = 0
let playerStartY = 0

let screenShake = 0
let invincibleTimer = 0

let mapWidth = 1080
let mapHeight = 1560
let cameraX = 0
let cameraY = 0

const TILE_SIZE = 40
const MAP_COLS = 12
const MAP_ROWS = 15

function initGame() {
  level.value = 1
  score.value = 0
  gameOver.value = false
  showLevelComplete.value = false
  isRunning.value = false
  scoreSubmitted = false

  resetPlayerStats()
  initLevel()
  draw()
}

function resetPlayerStats() {
  bladeCount.value = 1
  bladeSpeed.value = 0.05
  bladeRadius.value = 60
  bladeLength.value = 40
  bladeDamage.value = 1
  playerHp.value = 3
  playerSpeed.value = 1
}

function initLevel() {
  currentWave.value = 1
  totalWaves.value = 2 + Math.floor(level.value / 2)
  waveEnemiesKilled.value = 0
  waveEnemiesTotal.value = 8 + level.value * 3
  enemySpawnInterval = Math.max(40, 100 - level.value * 5)

  bossSpawned = false
  bossAlive = false
  boss = null

  enemies = []
  powerups = []
  particles = []
  damageTexts = []
  enemySpawnTimer = 0
  powerupSpawnTimer = 0
  invincibleTimer = 0

  mapWidth = canvasWidth.value * 3
  mapHeight = canvasHeight.value * 3

  generateMap()

  player.x = mapWidth / 2
  player.y = mapHeight / 2
  player.radius = 20

  const safe = findSafeSpawn(player.x, player.y)
  player.x = safe.x
  player.y = safe.y

  bladeAngle = 0
  updateBlades()
}

function updateCamera() {
  cameraX = player.x - canvasWidth.value / 2
  cameraY = player.y - canvasHeight.value / 2
  cameraX = Math.max(0, Math.min(mapWidth - canvasWidth.value, cameraX))
  cameraY = Math.max(0, Math.min(mapHeight - canvasHeight.value, cameraY))
}

function generateMap() {
  obstacles = []
  chests = []
  grassPatches = []

  for (let i = 0; i < 15 + level.value * 3; i++) {
    const x = 30 + Math.random() * (mapWidth - 60)
    const y = 60 + Math.random() * (mapHeight - 120)
    const type = Math.random() > 0.5 ? 'rock' : 'tree'
    const radius = type === 'rock' ? 18 + Math.random() * 10 : 20 + Math.random() * 8

    if (distanceToCenter(x, y) > 80) {
      obstacles.push({ x, y, radius, type })
    }
  }

  for (let i = 0; i < 4 + level.value; i++) {
    let x, y
    let attempts = 0
    do {
      x = 40 + Math.random() * (mapWidth - 80)
      y = 80 + Math.random() * (mapHeight - 160)
      attempts++
    } while (isNearObstacle(x, y, 50) && attempts < 20)

    chests.push({
      x, y,
      radius: 16,
      opened: false,
      type: 'chest',
      pulse: Math.random() * Math.PI * 2
    })
  }

  for (let i = 0; i < 40; i++) {
    grassPatches.push({
      x: Math.random() * mapWidth,
      y: Math.random() * mapHeight,
      size: 15 + Math.random() * 25,
      type: Math.floor(Math.random() * 3)
    })
  }
}

function distanceToCenter(x, y) {
  const cx = mapWidth / 2
  const cy = mapHeight / 2
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
}

function isNearObstacle(x, y, dist) {
  for (const obs of obstacles) {
    if (Math.sqrt((x - obs.x) ** 2 + (y - obs.y) ** 2) < obs.radius + dist) {
      return true
    }
  }
  return false
}

function findSafeSpawn(nearX, nearY) {
  let x = nearX
  let y = nearY
  let attempts = 0

  while (isNearObstacle(x, y, 30) && attempts < 50) {
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 50
    x = nearX + Math.cos(angle) * dist
    y = nearY + Math.sin(angle) * dist
    x = Math.max(30, Math.min(mapWidth - 30, x))
    y = Math.max(50, Math.min(mapHeight - 50, y))
    attempts++
  }

  return { x, y }
}

function updateBlades() {
  blades = []
  const count = bladeCount.value
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + bladeAngle
    blades.push({
      angle: angle,
      x: player.x + Math.cos(angle) * bladeRadius.value,
      y: player.y + Math.sin(angle) * bladeRadius.value
    })
  }
}

function spawnEnemy() {
  if (enemies.length >= 15 + level.value * 2) return
  if (waveEnemiesKilled.value + enemies.length >= waveEnemiesTotal.value && !bossSpawned) return

  const side = Math.floor(Math.random() * 4)
  let x, y

  switch (side) {
    case 0: x = cameraX + Math.random() * canvasWidth.value; y = cameraY - 40; break
    case 1: x = cameraX + canvasWidth.value + 40; y = cameraY + Math.random() * canvasHeight.value; break
    case 2: x = cameraX + Math.random() * canvasWidth.value; y = cameraY + canvasHeight.value + 40; break
    case 3: x = cameraX - 40; y = cameraY + Math.random() * canvasHeight.value; break
  }

  x = Math.max(0, Math.min(mapWidth, x))
  y = Math.max(0, Math.min(mapHeight, y))

  const types = getEnemyTypesForLevel()
  const type = types[Math.floor(Math.random() * types.length)]
  const enemy = createEnemy(x, y, type)
  enemies.push(enemy)
}

function getEnemyTypesForLevel() {
  const types = ['normal']
  if (level.value >= 2) types.push('fast')
  if (level.value >= 3) types.push('tank')
  if (level.value >= 4) types.push('ranged')
  if (level.value >= 5) types.push('fast', 'tank')
  return types
}

function createEnemy(x, y, type) {
  const levelMult = 1 + (level.value - 1) * 0.15
  let enemy = { x, y, type }

  switch (type) {
    case 'normal':
      enemy.radius = 14
      enemy.speed = 1.2 * levelMult
      enemy.hp = Math.ceil(1 * levelMult)
      enemy.maxHp = enemy.hp
      enemy.color = '#4ade80'
      enemy.score = 10
      break
    case 'fast':
      enemy.radius = 10
      enemy.speed = 2.2 * levelMult
      enemy.hp = Math.ceil(1 * levelMult)
      enemy.maxHp = enemy.hp
      enemy.color = '#facc15'
      enemy.score = 15
      break
    case 'tank':
      enemy.radius = 22
      enemy.speed = 0.8 * levelMult
      enemy.hp = Math.ceil(4 * levelMult)
      enemy.maxHp = enemy.hp
      enemy.color = '#f87171'
      enemy.score = 35
      break
    case 'ranged':
      enemy.radius = 13
      enemy.speed = 1.0 * levelMult
      enemy.hp = Math.ceil(2 * levelMult)
      enemy.maxHp = enemy.hp
      enemy.color = '#a78bfa'
      enemy.score = 25
      enemy.attackTimer = 0
      enemy.attackInterval = 120
      break
  }

  return enemy
}

function spawnBoss() {
  if (bossSpawned) return
  bossSpawned = true
  bossAlive = true

  const levelMult = 1 + (level.value - 1) * 0.3
  bossMaxHp = Math.ceil(50 * levelMult)
  bossHp = bossMaxHp

  boss = {
    x: cameraX + canvasWidth.value / 2,
    y: cameraY - 60,
    radius: 45,
    speed: 0.8,
    type: 'boss',
    phase: 1,
    attackTimer: 0,
    attackPattern: 0,
    color: '#ef4444',
    score: 500 * level.value
  }
}

function spawnPowerup(x, y, type = null) {
  const types = ['blade', 'damage', 'speed', 'range', 'heal', 'movespeed']
  const weights = [30, 20, 20, 15, 10, 5]

  let powerupType = type
  if (!powerupType) {
    const total = weights.reduce((a, b) => a + b, 0)
    let rand = Math.random() * total
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i]
      if (rand <= 0) {
        powerupType = types[i]
        break
      }
    }
  }

  powerups.push({
    x, y,
    radius: 16,
    type: powerupType,
    pulse: 0,
    vy: -2,
    life: 600
  })
}

function getPowerupInfo(type) {
  const info = {
    blade: { icon: '⚔️', name: '刀数+1', color: '#f472b6' },
    damage: { icon: '💥', name: '伤害+1', color: '#ef4444' },
    speed: { icon: '💨', name: '转速+', color: '#3b82f6' },
    range: { icon: '📏', name: '范围+', color: '#22c55e' },
    heal: { icon: '❤️', name: '生命+1', color: '#ec4899' },
    movespeed: { icon: '👟', name: '移速+', color: '#f59e0b' }
  }
  return info[type] || info.blade
}

function applyPowerup(type) {
  switch (type) {
    case 'blade':
      bladeCount.value = Math.min(8, bladeCount.value + 1)
      break
    case 'damage':
      bladeDamage.value += 1
      break
    case 'speed':
      bladeSpeed.value += 0.015
      break
    case 'range':
      bladeRadius.value += 8
      bladeLength.value += 5
      break
    case 'heal':
      playerHp.value = Math.min(5, playerHp.value + 1)
      break
    case 'movespeed':
      playerSpeed.value += 0.15
      break
  }
  updateBlades()
}

function openChest(chest) {
  if (chest.opened) return
  chest.opened = true

  addParticles(chest.x, chest.y, '#fbbf24', 20)

  const numItems = 1 + Math.floor(Math.random() * 2)
  for (let i = 0; i < numItems; i++) {
    setTimeout(() => {
      const angle = (Math.PI * 2 / numItems) * i + Math.random() * 0.5
      const dist = 30 + Math.random() * 20
      spawnPowerup(
        chest.x + Math.cos(angle) * dist,
        chest.y + Math.sin(angle) * dist
      )
    }, i * 100)
  }

  score.value += 50
}

function addParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      color,
      life: 1
    })
  }
}

function addDamageText(x, y, text, color = '#fff') {
  damageTexts.push({
    x, y,
    text,
    color,
    life: 1,
    vy: -1.5
  })
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    const dx = enemy.x - player.x
    const dy = enemy.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + enemy.radius) {
      if (invincibleTimer <= 0) {
        playerHp.value--
        invincibleTimer = 90
        screenShake = 10
        addParticles(player.x, player.y, '#ef4444', 15)

        if (playerHp.value <= 0) {
          endGame()
          return
        }
      }
    }

    let hitByBlade = false
    for (let j = 0; j < blades.length; j++) {
      if (isBladeHittingEnemy(blades[j], enemy)) {
        enemy.hp -= bladeDamage.value
        hitByBlade = true

        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x)
        enemy.x += Math.cos(angle) * 3
        enemy.y += Math.sin(angle) * 3

        addParticles(enemy.x, enemy.y, enemy.color, 4)
        addDamageText(enemy.x, enemy.y - enemy.radius, `-${bladeDamage.value}`, '#fff')

        break
      }
    }

    if (enemy.hp <= 0) {
      score.value += enemy.score
      waveEnemiesKilled.value++
      addParticles(enemy.x, enemy.y, enemy.color, 12)

      if (Math.random() < 0.15) {
        spawnPowerup(enemy.x, enemy.y)
      }

      enemies.splice(i, 1)
    }
  }

  if (boss && bossAlive) {
    for (let j = 0; j < blades.length; j++) {
      if (isBladeHittingEnemy(blades[j], boss)) {
        bossHp -= bladeDamage.value * 0.5
        addParticles(boss.x + (Math.random() - 0.5) * boss.radius,
                     boss.y + (Math.random() - 0.5) * boss.radius, '#ef4444', 3)
        break
      }
    }

    const dx = boss.x - player.x
    const dy = boss.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + boss.radius) {
      if (invincibleTimer <= 0) {
        playerHp.value -= 2
        invincibleTimer = 120
        screenShake = 15
        addParticles(player.x, player.y, '#ef4444', 20)

        if (playerHp.value <= 0) {
          endGame()
          return
        }
      }
    }

    if (bossHp <= 0) {
      bossAlive = false
      score.value += boss.score
      screenShake = 20
      addParticles(boss.x, boss.y, '#ef4444', 40)
      addParticles(boss.x, boss.y, '#fbbf24', 30)

      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const angle = Math.random() * Math.PI * 2
          const dist = 30 + Math.random() * 40
          spawnPowerup(boss.x + Math.cos(angle) * dist, boss.y + Math.sin(angle) * dist)
        }, i * 150)
      }

      boss = null

      setTimeout(() => {
        completeLevel()
      }, 1000)
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i]
    const dx = p.x - player.x
    const dy = p.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + p.radius) {
      applyPowerup(p.type)
      const info = getPowerupInfo(p.type)
      addParticles(p.x, p.y, info.color, 12)
      addDamageText(p.x, p.y - 20, info.name, info.color)
      powerups.splice(i, 1)
    }
  }

  for (const chest of chests) {
    if (chest.opened) continue
    const dx = chest.x - player.x
    const dy = chest.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + chest.radius) {
      openChest(chest)
    }
  }
}

function isBladeHittingEnemy(blade, enemy) {
  const angle = Math.atan2(blade.y - player.y, blade.x - player.x)
  const tipX = player.x + Math.cos(angle) * (bladeRadius.value + bladeLength.value)
  const tipY = player.y + Math.sin(angle) * (bladeRadius.value + bladeLength.value)
  const baseX = blade.x
  const baseY = blade.y

  const dist = pointToLineDistance(enemy.x, enemy.y, baseX, baseY, tipX, tipY)

  if (dist < enemy.radius + bladeWidth / 2) {
    const tipDist = Math.sqrt((enemy.x - tipX) ** 2 + (enemy.y - tipY) ** 2)
    const baseDist = Math.sqrt((enemy.x - baseX) ** 2 + (enemy.y - baseY) ** 2)
    if (tipDist < enemy.radius + bladeWidth || baseDist < enemy.radius + bladeWidth) {
      return true
    }

    const totalLen = Math.sqrt((tipX - baseX) ** 2 + (tipY - baseY) ** 2)
    const projLen = ((enemy.x - baseX) * (tipX - baseX) + (enemy.y - baseY) * (tipY - baseY)) / totalLen
    if (projLen >= 0 && projLen <= totalLen) {
      return true
    }
  }
  return false
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = lenSq !== 0 ? dot / lenSq : -1

  let xx, yy
  if (param < 0) { xx = x1; yy = y1 }
  else if (param > 1) { xx = x2; yy = y2 }
  else { xx = x1 + param * C; yy = y1 + param * D }

  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
}

function updateEnemies() {
  for (const enemy of enemies) {
    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      const moveX = (dx / dist) * enemy.speed
      const moveY = (dy / dist) * enemy.speed

      let newX = enemy.x + moveX
      let newY = enemy.y + moveY

      let blocked = false
      for (const obs of obstacles) {
        const odx = newX - obs.x
        const ody = newY - obs.y
        const odist = Math.sqrt(odx * odx + ody * ody)
        if (odist < enemy.radius + obs.radius) {
          blocked = true
          break
        }
      }

      if (!blocked) {
        enemy.x = newX
        enemy.y = newY
      } else {
        if (dy !== 0) enemy.y += (dy / Math.abs(dy)) * enemy.speed * 0.5
        if (dx !== 0) enemy.x += (dx / Math.abs(dx)) * enemy.speed * 0.5
      }
    }
  }

  if (boss && bossAlive) {
    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 100) {
      boss.x += (dx / dist) * boss.speed
      boss.y += (dy / dist) * boss.speed
    } else {
      boss.attackTimer++
      if (boss.attackTimer >= 60) {
        boss.attackTimer = 0
        screenShake = 5
      }
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1
    p.life -= 0.025
    p.radius *= 0.98

    if (p.life <= 0) particles.splice(i, 1)
  }

  for (let i = damageTexts.length - 1; i >= 0; i--) {
    const t = damageTexts[i]
    t.y += t.vy
    t.life -= 0.02
    if (t.life <= 0) damageTexts.splice(i, 1)
  }
}

function checkWaveComplete() {
  if (bossSpawned) return

  if (waveEnemiesKilled.value >= waveEnemiesTotal.value && enemies.length === 0) {
    if (currentWave.value < totalWaves.value) {
      currentWave.value++
      waveEnemiesKilled.value = 0
      waveEnemiesTotal.value = 10 + level.value * 3 + currentWave.value * 5
      enemySpawnInterval = Math.max(30, enemySpawnInterval - 10)
    } else {
      spawnBoss()
    }
  }
}

function completeLevel() {
  showLevelComplete.value = true
  isRunning.value = false
  levelBonus.value = level.value * 200
  score.value += levelBonus.value
}

function nextLevel() {
  showLevelComplete.value = false
  level.value++
  initLevel()
  isRunning.value = true
  gameLoop()
}

function endGame() {
  gameOver.value = true
  isRunning.value = false
  handleGameOver()
}

function draw() {
  if (!ctx) return

  ctx.save()
  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,
      (Math.random() - 0.5) * screenShake
    )
    screenShake *= 0.9
    if (screenShake < 0.5) screenShake = 0
  }

  updateCamera()
  ctx.translate(-cameraX, -cameraY)

  drawBackground()
  drawGrass()
  drawObstacles()
  drawChests()
  drawPowerups()
  drawParticles()
  drawEnemies()
  drawBoss()
  drawBlades()
  drawPlayer()
  drawDamageTexts()

  ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, mapWidth, mapHeight)

  ctx.restore()
}

function drawBackground() {
  const sx = Math.floor(cameraX / TILE_SIZE) * TILE_SIZE
  const sy = Math.floor(cameraY / TILE_SIZE) * TILE_SIZE
  const gradient = ctx.createLinearGradient(sx, sy, sx, sy + canvasHeight.value)
  gradient.addColorStop(0, '#1a4d2e')
  gradient.addColorStop(1, '#0d2818')
  ctx.fillStyle = gradient
  ctx.fillRect(sx, sy, canvasWidth.value, canvasHeight.value)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
  ctx.lineWidth = 1
  for (let x = sx; x < sx + canvasWidth.value + TILE_SIZE; x += TILE_SIZE) {
    ctx.beginPath()
    ctx.moveTo(x, sy)
    ctx.lineTo(x, sy + canvasHeight.value)
    ctx.stroke()
  }
  for (let y = sy; y < sy + canvasHeight.value + TILE_SIZE; y += TILE_SIZE) {
    ctx.beginPath()
    ctx.moveTo(sx, y)
    ctx.lineTo(sx + canvasWidth.value, y)
    ctx.stroke()
  }
}

function drawGrass() {
  for (const grass of grassPatches) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(grass.x, grass.y, grass.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawObstacles() {
  for (const obs of obstacles) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3

    if (obs.type === 'rock') {
      const gradient = ctx.createRadialGradient(
        obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.3, 0,
        obs.x, obs.y, obs.radius
      )
      gradient.addColorStop(0, '#9ca3af')
      gradient.addColorStop(1, '#4b5563')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.arc(obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.3, obs.radius * 0.3, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(obs.x - 4, obs.y, 8, obs.radius * 0.6)

      const gradient = ctx.createRadialGradient(
        obs.x, obs.y - obs.radius * 0.2, 0,
        obs.x, obs.y - obs.radius * 0.2, obs.radius
      )
      gradient.addColorStop(0, '#22c55e')
      gradient.addColorStop(1, '#15803d')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(obs.x, obs.y - obs.radius * 0.2, obs.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'
      ctx.beginPath()
      ctx.arc(obs.x - obs.radius * 0.5, obs.y, obs.radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(obs.x + obs.radius * 0.5, obs.y, obs.radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

function drawChests() {
  for (const chest of chests) {
    chest.pulse = (chest.pulse + 0.03) % (Math.PI * 2)

    ctx.save()

    if (!chest.opened) {
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 10 + Math.sin(chest.pulse) * 5

      const cy = chest.y + Math.sin(chest.pulse) * 2
      const w = chest.radius * 1.6
      const h = chest.radius * 1.3

      ctx.fillStyle = '#92400e'
      ctx.fillRect(chest.x - w / 2, cy - h / 2, w, h)

      const bodyGrad = ctx.createLinearGradient(chest.x - w / 2, 0, chest.x + w / 2, 0)
      bodyGrad.addColorStop(0, '#d97706')
      bodyGrad.addColorStop(0.5, '#fbbf24')
      bodyGrad.addColorStop(1, '#d97706')
      ctx.fillStyle = bodyGrad
      ctx.fillRect(chest.x - w / 2, cy - h / 4, w, h * 0.75)

      const lidGrad = ctx.createLinearGradient(chest.x - w / 2, 0, chest.x + w / 2, 0)
      lidGrad.addColorStop(0, '#b45309')
      lidGrad.addColorStop(0.5, '#f59e0b')
      lidGrad.addColorStop(1, '#b45309')
      ctx.fillStyle = lidGrad
      ctx.beginPath()
      ctx.moveTo(chest.x - w / 2, cy - h / 4)
      ctx.quadraticCurveTo(chest.x, cy - h / 2 - 8, chest.x + w / 2, cy - h / 4)
      ctx.lineTo(chest.x + w / 2, cy - h / 4)
      ctx.lineTo(chest.x - w / 2, cy - h / 4)
      ctx.fill()

      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(chest.x - 4, cy - h / 4, 8, h * 0.5)
      ctx.beginPath()
      ctx.arc(chest.x, cy + 2, 5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = 0.4
      const w = chest.radius * 1.5
      const h = chest.radius * 1.2
      ctx.fillStyle = '#78350f'
      ctx.fillRect(chest.x - w / 2, chest.y - h / 4, w, h * 0.75)
    }

    ctx.restore()
  }
}

function drawPowerups() {
  for (const p of powerups) {
    p.pulse = (p.pulse + 0.08) % (Math.PI * 2)
    const info = getPowerupInfo(p.type)
    const scale = 1 + Math.sin(p.pulse) * 0.15

    ctx.save()
    ctx.shadowColor = info.color
    ctx.shadowBlur = 12

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * scale)
    gradient.addColorStop(0, '#fff')
    gradient.addColorStop(0.3, info.color)
    gradient.addColorStop(1, info.color)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(info.icon, p.x, p.y)

    ctx.restore()
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawDamageTexts() {
  for (const t of damageTexts) {
    ctx.save()
    ctx.globalAlpha = t.life
    ctx.fillStyle = t.color
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2
    ctx.strokeText(t.text, t.x, t.y)
    ctx.fillText(t.text, t.x, t.y)
    ctx.restore()
  }
}

function drawPlayer() {
  ctx.save()

  if (invincibleTimer > 0 && Math.floor(invincibleTimer / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5
  }

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
  ctx.arc(player.x - 6, player.y - 3, 5, 0, Math.PI * 2)
  ctx.arc(player.x + 6, player.y - 3, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1e3a5f'
  ctx.beginPath()
  ctx.arc(player.x - 5, player.y - 3, 2.5, 0, Math.PI * 2)
  ctx.arc(player.x + 7, player.y - 3, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawBlades() {
  for (const blade of blades) {
    const angle = Math.atan2(blade.y - player.y, blade.x - player.x)
    const tipX = player.x + Math.cos(angle) * (bladeRadius.value + bladeLength.value)
    const tipY = player.y + Math.sin(angle) * (bladeRadius.value + bladeLength.value)
    const baseX = blade.x
    const baseY = blade.y

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
    ctx.arc(baseX, baseY, bladeWidth / 2 + 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fce7f3'
    ctx.beginPath()
    ctx.arc(tipX, tipY, bladeWidth / 2 + 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save()
    ctx.shadowColor = enemy.color
    ctx.shadowBlur = 8

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

    if (enemy.maxHp > 1) {
      const barW = enemy.radius * 2
      const barH = 4
      const barX = enemy.x - barW / 2
      const barY = enemy.y - enemy.radius - 8

      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(barX, barY, barW, barH)

      ctx.fillStyle = '#22c55e'
      ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH)
    }

    ctx.restore()
  }
}

function drawBoss() {
  if (!boss || !bossAlive) return

  ctx.save()
  ctx.shadowColor = '#dc2626'
  ctx.shadowBlur = 25

  const gradient = ctx.createRadialGradient(
    boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.3, 0,
    boss.x, boss.y, boss.radius
  )
  gradient.addColorStop(0, '#fca5a5')
  gradient.addColorStop(0.5, '#ef4444')
  gradient.addColorStop(1, '#b91c1c')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.moveTo(boss.x - boss.radius * 0.6, boss.y - boss.radius * 0.5)
  ctx.lineTo(boss.x - boss.radius * 0.4, boss.y - boss.radius * 1.1)
  ctx.lineTo(boss.x - boss.radius * 0.2, boss.y - boss.radius * 0.5)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(boss.x + boss.radius * 0.6, boss.y - boss.radius * 0.5)
  ctx.lineTo(boss.x + boss.radius * 0.4, boss.y - boss.radius * 1.1)
  ctx.lineTo(boss.x + boss.radius * 0.2, boss.y - boss.radius * 0.5)
  ctx.fill()

  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(boss.x - boss.radius * 0.35, boss.y - boss.radius * 0.1, boss.radius * 0.2, 0, Math.PI * 2)
  ctx.arc(boss.x + boss.radius * 0.35, boss.y - boss.radius * 0.1, boss.radius * 0.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.05, boss.radius * 0.1, 0, Math.PI * 2)
  ctx.arc(boss.x + boss.radius * 0.4, boss.y - boss.radius * 0.05, boss.radius * 0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#7f1d1d'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(boss.x, boss.y + boss.radius * 0.2, boss.radius * 0.3, 0.2, Math.PI - 0.2)
  ctx.stroke()

  const barW = boss.radius * 2.5
  const barH = 8
  const barX = boss.x - barW / 2
  const barY = boss.y - boss.radius - 20

  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4)

  const hpRatio = bossHp / bossMaxHp
  const hpGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  hpGradient.addColorStop(0, '#ef4444')
  hpGradient.addColorStop(1, '#f97316')
  ctx.fillStyle = hpGradient
  ctx.fillRect(barX, barY, barW * hpRatio, barH)

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('BOSS', boss.x, barY - 5)

  ctx.restore()
}

function gameLoop() {
  if (!isRunning.value || gameOver.value || showLevelComplete.value) return

  updateCamera()
  bladeAngle += bladeSpeed.value
  updateBlades()

  if (invincibleTimer > 0) invincibleTimer--

  enemySpawnTimer++
  if (enemySpawnTimer >= enemySpawnInterval && !bossSpawned) {
    spawnEnemy()
    enemySpawnTimer = 0
  }

  powerupSpawnTimer++
  if (powerupSpawnTimer >= 500) {
    powerupSpawnTimer = 0
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    powerups[i].life--
    if (powerups[i].life <= 0) {
      powerups.splice(i, 1)
    }
  }

  updateEnemies()
  updateParticles()
  checkCollisions()
  checkWaveComplete()

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
    x: (clientX - rect.left) * scaleX + cameraX,
    y: (clientY - rect.top) * scaleY + cameraY
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
  movePlayer(getCanvasPos(e))
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
  movePlayer(getCanvasPos(e))
}

function handleMouseUp() {
  isDragging = false
}

function movePlayer(pos) {
  const dx = pos.x - dragStartX
  const dy = pos.y - dragStartY

  let newX = playerStartX + dx * playerSpeed.value
  let newY = playerStartY + dy * playerSpeed.value

  newX = Math.max(player.radius, Math.min(mapWidth - player.radius, newX))
  newY = Math.max(player.radius, Math.min(mapHeight - player.radius, newY))

  for (const obs of obstacles) {
    const odx = newX - obs.x
    const ody = newY - obs.y
    const odist = Math.sqrt(odx * odx + ody * ody)
    const minDist = player.radius + obs.radius

    if (odist < minDist) {
      const angle = Math.atan2(ody, odx)
      newX = obs.x + Math.cos(angle) * minDist
      newY = obs.y + Math.sin(angle) * minDist
    }
  }

  player.x = newX
  player.y = newY
  updateBlades()
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
  canvasHeight.value = screenWidth * 1.4

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
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
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

.mission-bar {
  width: calc(100% - 32px);
  margin: 0 16px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
}

.mission-text {
  color: white;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.mission-progress-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.mission-progress {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #84cc16);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stat-row {
  display: flex;
  gap: 6px;
  padding: 0 16px 10px;
  width: 100%;
}

.stat-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 16px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: white;
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
  background: rgba(0, 0, 0, 0.7);
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
  line-height: 1.6;
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

.buff-bar {
  position: fixed;
  top: 160px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.buff-item {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  font-size: 11px;
}

.buff-icon {
  font-size: 12px;
}

.buff-name {
  font-weight: 600;
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

.game-tip {
  margin-top: 10px;
  padding: 0 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.game-tip p {
  margin: 0;
  line-height: 1.5;
}
</style>