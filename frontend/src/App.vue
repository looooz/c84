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
import { ref, onMounted, onUnmounted, provide, reactive } from 'vue'
import OrientationTip from './components/OrientationTip.vue'
import CelebrateModal from './components/CelebrateModal.vue'
import { getScores, updateScore } from './utils/api'

const showOrientationTip = ref(false)
const celebrateVisible = ref(false)
const celebrateScore = ref(0)
const celebrateGameName = ref('')

const highScores = reactive({
  '2048': 0,
  'snake': 0,
  'tetris': 0,
  'bigfish': 0,
  'blade': 0,
  'tank': 0
})

let isLoadingScores = false
let loadScoresPromise = null

async function loadHighScores() {
  if (isLoadingScores && loadScoresPromise) {
    return loadScoresPromise
  }
  isLoadingScores = true
  loadScoresPromise = (async () => {
    try {
      const scores = await getScores()
      Object.keys(scores).forEach(key => {
        const newScore = scores[key].score
        if (typeof newScore === 'number' && newScore >= 0) {
          if (newScore >= (highScores[key] || 0)) {
            highScores[key] = newScore
          }
        }
      })
    } catch (e) {
      console.error('加载最高分失败:', e)
    } finally {
      isLoadingScores = false
      loadScoresPromise = null
    }
  })()
  return loadScoresPromise
}

async function submitScore(gameName, score, playerName = '玩家') {
  try {
    const result = await updateScore(gameName, score, playerName)
    if (result && typeof result.score === 'number') {
      if (result.score >= (highScores[gameName] || 0)) {
        highScores[gameName] = result.score
      }
      if (result.isNewRecord) {
        showCelebrate(result.score, gameName)
      }
    }
    return result
  } catch (e) {
    console.error('提交分数失败:', e)
    return null
  }
}

function showCelebrate(score, gameName) {
  celebrateScore.value = score
  celebrateGameName.value = gameName
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
provide('submitScore', submitScore)
provide('showCelebrate', showCelebrate)

onMounted(() => {
  checkOrientation()
  loadHighScores()
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
