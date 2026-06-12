<template>
  <div class="bottom-nav">
    <div
      class="nav-item"
      :class="{ active: activeTab === 'home' }"
      @click="switchTab('home')"
    >
      <el-icon :size="22"><House /></el-icon>
      <span>首页</span>
    </div>
    <div
      class="nav-item"
      :class="{ active: activeTab === 'mine' }"
      @click="switchTab('mine')"
    >
      <el-icon :size="22"><User /></el-icon>
      <span>我的</span>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  if (route.path.startsWith('/mine')) return 'mine'
  return 'home'
})

function switchTab(tab) {
  if (tab === activeTab.value) return
  router.push({ path: '/' + tab })
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.nav-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 12px;
  gap: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item.active {
  color: #667eea;
}

.nav-item.active .el-icon {
  animation: pop 0.3s ease;
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
