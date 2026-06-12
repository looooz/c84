<template>
  <div class="game-card" @click="handleClick">
    <div class="card-icon" :style="{ background: iconBg }">
      <span class="icon-text">{{ icon }}</span>
    </div>
    <div class="card-info">
      <div class="card-name">{{ name }}</div>
      <div class="card-score">
        <el-icon :size="14"><Trophy /></el-icon>
        <span>最高分: {{ highScore || 0 }}</span>
      </div>
    </div>
    <div class="card-arrow">
      <el-icon :size="20"><ArrowRight /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🎮'
  },
  iconBg: {
    type: String,
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  highScore: {
    type: Number,
    default: 0
  },
  route: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['click'])
const router = useRouter()

function handleClick() {
  emit('click')
  router.push({ path: props.route })
}
</script>

<style scoped>
.game-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.game-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 32px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
}

.card-score {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #f39c12;
  font-weight: 500;
}

.card-arrow {
  color: #ccc;
  flex-shrink: 0;
}
</style>
