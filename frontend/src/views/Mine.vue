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
              <div class="stat-score">{{ highScores[game.key] || 0 }}</div>
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
import { ref, inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import { useSwipe } from '../utils/touch'

const router = useRouter()
const pageRef = ref(null)

const highScores = inject('highScores')
const loadHighScores = inject('loadHighScores')

const games = [
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
  }
]

let swipeHandler = null

function goToGame(route) {
  router.push({ path: route })
}

async function refreshScores() {
  await loadHighScores()
}

onMounted(() => {
  loadHighScores()
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
