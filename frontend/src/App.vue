<template>
  <div class="app-wrapper">
    <router-view />
    <OrientationTip v-if="showOrientationTip" />
    <CelebrateModal
      v-model:visible="celebrateVisible"
      :score="celebrateScore"
      :gameName="celebrateGameName"
      @closed="onCelebrateClosed"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, reactive, nextTick } from 'vue'
import OrientationTip from './components/OrientationTip.vue'
import CelebrateModal from './components/CelebrateModal.vue'
import { getScores, updateScore } from './utils/api'

const showOrientationTip = ref(false)
const celebrateVisible = ref(false)
const celebrateScore = ref(0)
const celebrateGameName = ref('')

const ALL_GAMES = ['2048', 'snake', 'tetris', 'bigfish', 'blade', 'tank']
const STORAGE_KEY = 'mini_game_highscores_v1'

const highScores = reactive({
  '2048': 0,
  'snake': 0,
  'tetris': 0,
  'bigfish': 0,
  'blade': 0,
  'tank': 0
})

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      if (stored && typeof stored === 'object') {
        ALL_GAMES.forEach(k => {
          if (typeof stored[k] === 'number' && stored[k] >= 0) {
            highScores[k] = Math.max(highScores[k] || 0, stored[k])
          }
        })
        return true
      }
    }
  } catch (e) {
    console.warn('读取localStorage失败:', e)
  }
  return false
}

function writeToStorage() {
  try {
    const data = {}
    ALL_GAMES.forEach(k => {
      data[k] = typeof highScores[k] === 'number' ? highScores[k] : 0
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('写入localStorage失败:', e)
  }
}

let isLoadingScores = false
let loadScoresPromise = null

async function loadHighScores() {
  if (isLoadingScores && loadScoresPromise) {
    return loadScoresPromise
  }
  readFromStorage()
  isLoadingScores = true
  loadScoresPromise = (async () => {
    let apiSuccess = false
    try {
      const scores = await getScores()
      if (scores && typeof scores === 'object') {
        ALL_GAMES.forEach(key => {
          if (scores[key] && typeof scores[key].score === 'number') {
            const newScore = scores[key].score
            if (newScore >= 0) {
              highScores[key] = Math.max(highScores[key] || 0, newScore)
            }
          }
        })
        apiSuccess = true
        writeToStorage()
      }
    } catch (e) {
      console.error('从API加载最高分失败，使用本地缓存:', e.message)
    } finally {
      isLoadingScores = false
      loadScoresPromise = null
      ALL_GAMES.forEach(k => {
        if (typeof highScores[k] !== 'number' || highScores[k] < 0) {
          highScores[k] = 0
        }
      })
    }
    return apiSuccess
  })()
  return loadScoresPromise
}

async function refreshHighScores() {
  isLoadingScores = false
  loadScoresPromise = null
  return loadHighScores()
}

function updateHighScore(gameName, score) {
  if (!ALL_GAMES.includes(gameName)) return false
  if (typeof score !== 'number' || score < 0) return false
  const prev = typeof highScores[gameName] === 'number' ? highScores[gameName] : 0
  if (score > prev) {
    highScores[gameName] = score
    writeToStorage()
    return true
  }
  return false
}

async function submitScore(gameName, score, playerName = '玩家') {
  try {
    const isLocalBetter = updateHighScore(gameName, score)
    let result = null
    try {
      result = await updateScore(gameName, score, playerName)
      if (result && typeof result.score === 'number') {
        updateHighScore(gameName, result.score)
        if (result.isNewRecord || isLocalBetter) {
          showCelebrate(Math.max(score, typeof result.score === 'number' ? result.score : 0), gameName)
        }
      }
    } catch (apiErr) {
      console.warn('API提交分数失败，本地已记录:', apiErr.message)
      if (isLocalBetter) {
        showCelebrate(score, gameName)
      }
      result = {
        gameName,
        score,
        playerName,
        isNewRecord: isLocalBetter,
        previousScore: highScores[gameName] || 0
      }
    }
    writeToStorage()
    return result
  } catch (e) {
    console.error('提交分数严重错误:', e)
    return null
  }
}

function showCelebrate(score, gameName) {
  const gameNames = {
    '2048': '2048',
    'snake': '贪吃蛇',
    'tetris': '俄罗斯方块',
    'bigfish': '大鱼吃小鱼',
    'blade': '转刀割草',
    'tank': '坦克大战'
  }
  celebrateScore.value = score
  celebrateGameName.value = gameNames[gameName] || gameName
  celebrateVisible.value = true
  createConfetti()
}

function onCelebrateClosed() {
  celebrateVisible.value = false
}

function createConfetti() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894']
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div')
      confetti.className = 'confetti'
      confetti.style.left = Math.random() * 100 + 'vw'
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's'
      confetti.style.animationDelay = Math.random() * 0.5 + 's'
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
      document.body.appendChild(confetti)
      setTimeout(() => confetti.remove(), 5000)
    }, i * 50)
  }
}

function checkOrientation() {
  const isLandscape = window.innerWidth > window.innerHeight
  const isMobile = window.innerWidth < 768
  showOrientationTip.value = isMobile && isLandscape
}

function handleResize() {
  checkOrientation()
}

provide('highScores', highScores)
provide('loadHighScores', loadHighScores)
provide('refreshHighScores', refreshHighScores)
provide('submitScore', submitScore)
provide('showCelebrate', showCelebrate)
provide('updateHighScore', updateHighScore)

onMounted(() => {
  checkOrientation()
  readFromStorage()
  nextTick(() => loadHighScores())
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', checkOrientation)
})
</script>

<style scoped>
.app-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
