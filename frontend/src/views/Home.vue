<template>
  <div class="page-container home-page" ref="pageRef">
    <div class="page-content">
      <div class="header">
        <div class="header-title">
          <h1>🎮 休闲游戏平台</h1>
          <p>精选小游戏，随时来一局</p>
        </div>
        <div class="header-avatar" @click="goToMine">
          <el-icon :size="28"><User /></el-icon>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span>热门游戏</span>
          <span class="section-subtitle">{{ games.length }} 款游戏</span>
        </div>
        <div class="game-grid" ref="gridRef">
          <GameCard
            v-for="game in games"
            :key="game.id"
            :name="game.name"
            :icon="game.icon"
            :icon-bg="game.iconBg"
            :high-score="game.highScore"
            :route="game.route"
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span>操作说明</span>
        </div>
        <div class="tips-card">
          <div class="tip-item">
            <div class="tip-icon">👆</div>
            <div class="tip-content">
              <div class="tip-title">触摸滑动</div>
              <div class="tip-desc">在游戏区域滑动控制方向</div>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">📱</div>
            <div class="tip-content">
              <div class="tip-title">竖屏体验</div>
              <div class="tip-desc">建议竖屏使用获得最佳体验</div>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">🏆</div>
            <div class="tip-content">
              <div class="tip-title">记录最高分</div>
              <div class="tip-desc">每局结束自动更新最高记录</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-space"></div>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import GameCard from '../components/GameCard.vue'
import BottomNav from '../components/BottomNav.vue'
import { useSwipe } from '../utils/touch'

const router = useRouter()
const route = useRoute()
const pageRef = ref(null)
const gridRef = ref(null)

const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')
const refreshHighScores = inject('refreshHighScores')

const ALL_GAMES_KEY = ['2048', 'snake', 'tetris', 'bigfish', 'blade', 'tank']

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

const games = computed(() => [
  {
    id: 1,
    key: '2048',
    name: '2048',
    icon: '2️⃣',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    route: '/game/2048',
    highScore: gameScoreMap.value['2048']
  },
  {
    id: 2,
    key: 'snake',
    name: '贪吃蛇',
    icon: '🐍',
    iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    route: '/game/snake',
    highScore: gameScoreMap.value['snake']
  },
  {
    id: 3,
    key: 'tetris',
    name: '俄罗斯方块',
    icon: '🧱',
    iconBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    route: '/game/tetris',
    highScore: gameScoreMap.value['tetris']
  },
  {
    id: 4,
    key: 'bigfish',
    name: '大鱼吃小鱼',
    icon: '🐟',
    iconBg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    route: '/game/bigfish',
    highScore: gameScoreMap.value['bigfish']
  },
  {
    id: 5,
    key: 'blade',
    name: '转刀割草',
    icon: '⚔️',
    iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    route: '/game/blade',
    highScore: gameScoreMap.value['blade']
  },
  {
    id: 6,
    key: 'tank',
    name: '坦克大战',
    icon: '🎮',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    route: '/game/tank',
    highScore: gameScoreMap.value['tank']
  }
])

let swipeHandler = null

function goToMine() {
  router.push({ path: '/mine' })
}

watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/home') {
      refreshHighScores()
    }
  },
  { immediate: false }
)

onMounted(() => {
  refreshHighScores()
  swipeHandler = useSwipe(pageRef.value, {
    onSwipeLeft: () => {
      router.push({ path: '/mine' })
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
.home-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  color: white;
}

.header-title h1 {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.header-title p {
  font-size: 14px;
  opacity: 0.8;
}

.header-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-avatar:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.3);
}

.section {
  padding: 0 20px;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  margin-bottom: 16px;
}

.section-title span:first-child {
  font-size: 20px;
  font-weight: 700;
}

.section-subtitle {
  font-size: 13px;
  opacity: 0.7;
}

.game-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 480px) {
  .game-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .game-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (orientation: landscape) and (max-width: 767px) {
  .game-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tips-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 8px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.tip-item:last-child {
  border-bottom: none;
}

.tip-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.tip-desc {
  font-size: 13px;
  color: #666;
}

.bottom-space {
  height: 80px;
}
</style>
