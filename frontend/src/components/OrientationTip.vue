<template>
  <div class="orientation-warning">
    <div class="icon">📱</div>
    <div class="tip-title">请竖屏使用</div>
    <div class="tip-desc">为获得最佳游戏体验，请将手机竖过来</div>
  </div>
</template>

<style scoped>
.orientation-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
}

.icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: rotateHint 2s ease-in-out infinite;
}

@keyframes rotateHint {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-90deg); }
}

.tip-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.tip-desc {
  font-size: 14px;
  opacity: 0.7;
}
</style>
