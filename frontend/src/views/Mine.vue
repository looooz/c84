<template>
  <div class="page-container mine-page" ref="pageRef">
    <div class="page-content">
      <div class="user-section">
        <div class="user-avatar">
          <el-icon :size="40"><User /></el-icon>
        </div>
        <div class="user-info">
          <div class="user-name">玩家</div>
          <div class="user-desc">休闲游戏爱好者</div>
        </div>
        <div class="user-total-score">
          <div class="total-label">总分</div>
          <div class="total-value">{{ totalScore }}</div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-title">
          <el-icon :size="18"><Trophy /></el-icon>
          <span>最高分记录</span>
        </div>
        <div class="stats-grid">
          <div
            v-for="game in games"
            :key="game.key"
            class="stat-card"
            @click="goToGame(game.route)"
          >
            <div class="stat-icon" :style="{ background: game.iconBg }">
              {{ game.icon }}
            </div>
            <div class="stat-info">
              <div class="stat-name">{{ game.name }}</div>
              <div class="stat-score">{{ game.highScore }}</div>
            </div>
            <el-icon :size="20" class="stat-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <div class="about-section">
        <div class="about-card">
          <div class="about-item" @click="refreshScores">
            <div class="about-icon">🔄</div>
            <div class="about-text">刷新数据</div>
            <el-icon :size="18" class="about-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="about-item">
            <div class="about-icon">ℹ️</div>
            <div class="about-text">版本信息</div>
            <div class="about-value">v1.0.0</div>
          </div>
          <div class="about-item">
            <div class="about-icon">📱</div>
            <div class="about-text">技术栈</div>
            <div class="about-value">Vue3 + Node.js</div>
          </div>
        </div>
      </div>

      <div class="bottom-space"></div>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import { useSwipe } from '../utils/touch'

const router = useRouter()
const route = useRoute()
const pageRef = ref(null)

const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')
const refreshHighScores = inject('refreshHighScores')

const ALL_GAMES_KEY = ['2048', 'snake', 'tetris', 'bigfish', 'blade', 'tank', 'link']

function getHighScore(key) {
  if (typeof highScores !== 'object' || highScores === null) return 0
  const val = highScores[key]
  return typeof val === 'number' ? val : 0
}

const gameScoreMap = computed(() => {
  const map = {}
  ALL_GAMES_KEY.forEach(k => { map[k] = getHighScore(k) })
  return map
})

const GAMES_DEF = [
  {
    key: '2048',
    name: '2048',
    icon: '2️⃣',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    route: '/game/2048'
  },
  {
    key: 'snake',
    name: '贪吃蛇',
    icon: '🐍',
    iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    route: '/game/snake'
  },
  {
    key: 'tetris',
    name: '俄罗斯方块',
    icon: '🧱',
    iconBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    route: '/game/tetris'
  },
  {
    key: 'bigfish',
    name: '大鱼吃小鱼',
    icon: '🐟',
    iconBg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    route: '/game/bigfish'
  },
  {
    key: 'blade',
    name: '转刀割草',
    icon: '⚔️',
    iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    route: '/game/blade'
  },
  {
    key: 'tank',
    name: '坦克大战',
    icon: '🎮',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    route: '/game/tank'
  },
  {
    key: 'link',
    name: '连连看',
    icon: '🎴',
    iconBg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    route: '/game/link'
  }
]

const games = computed(() => {
  return GAMES_DEF.map(g => ({
    ...g,
    highScore: gameScoreMap.value[g.key]
  }))
})

const totalScore = computed(() => {
  let total = 0
  ALL_GAMES_KEY.forEach(k => {
    total += gameScoreMap.value[k] || 0
  })
  return total
})

let swipeHandler = null

function goToGame(route) {
  router.push({ path: route })
}

async function refreshScores() {
  await refreshHighScores()
}

watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/mine') {
      refreshHighScores()
    }
  },
  { immediate: false }
)

onMounted(() => {
  refreshHighScores()
  swipeHandler = useSwipe(pageRef.value, {
    onSwipeRight: () => {
      router.push({ path: '/home' })
    },
    threshold: 80,
    preventDefault: false
  })
  swipeHandler.bind()
})

onUnmounted(() => {
  if (swipeHandler) {
    swipeHandler.unbind()
  }
})
</script>

<style scoped>
.mine-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 30px 20px;
  color: white;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.user-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.user-desc {
  font-size: 14px;
  opacity: 0.8;
}

.user-total-score {
  margin-left: auto;
  text-align: right;
  color: white;
  padding: 8px 14px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.total-label {
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 2px;
}

.total-value {
  font-size: 22px;
  font-weight: 800;
  color: #fbbf24;
}

.stats-section {
  padding: 0 20px;
  margin-bottom: 24px;
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-score {
  font-size: 24px;
  font-weight: 800;
  color: #f39c12;
}

.stat-arrow {
  color: #ccc;
}

.about-section {
  padding: 0 20px;
}

.about-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.about-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s ease;
}

.about-item:last-child {
  border-bottom: none;
}

.about-item:active {
  background: #f5f5f5;
}

.about-icon {
  font-size: 22px;
  width: 32px;
  text-align: center;
}

.about-text {
  flex: 1;
  font-size: 15px;
  color: #333;
}

.about-value {
  font-size: 14px;
  color: #666;
}

.about-arrow {
  color: #ccc;
}

.bottom-space {
  height: 80px;
}
</style>
