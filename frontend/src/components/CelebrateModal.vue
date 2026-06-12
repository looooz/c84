<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="90vw"
    max-width="360px"
    class="celebrate-modal"
    :show-close="false"
    @update:model-value="handleUpdate"
    @closed="$emit('closed')"
  >
    <div class="celebrate-content">
      <div class="celebrate-emoji">🎉</div>
      <div class="celebrate-text">恭喜！新的最高分</div>
      <div class="celebrate-score">{{ score }}</div>
      <div class="celebrate-game">{{ gameName }}</div>
    </div>
    <template #footer>
      <button class="btn-primary" style="width: 100%;" @click="handleClose">
        太棒了！
      </button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  score: {
    type: Number,
    default: 0
  },
  gameName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'closed'])

const title = computed(() => `🎊 新纪录！`)

function handleUpdate(val) {
  emit('update:visible', val)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<style scoped>
.celebrate-modal :deep(.el-dialog) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 24px;
  border: none;
  margin-top: 20vh !important;
}

.celebrate-modal :deep(.el-dialog__header),
.celebrate-modal :deep(.el-dialog__body),
.celebrate-modal :deep(.el-dialog__footer) {
  color: white;
}

.celebrate-modal :deep(.el-dialog__title) {
  color: white;
  font-size: 22px;
}

.celebrate-modal :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
}

.celebrate-content {
  text-align: center;
  padding: 10px 0;
}

.celebrate-emoji {
  font-size: 72px;
  animation: bounce 0.5s ease infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-15px); }
}

.celebrate-text {
  font-size: 16px;
  opacity: 0.95;
  margin-top: 8px;
}

.celebrate-score {
  font-size: 56px;
  font-weight: 800;
  margin: 12px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.celebrate-game {
  font-size: 14px;
  opacity: 0.8;
}
</style>
