import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '游戏大厅' }
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('../views/Mine.vue'),
    meta: { title: '我的' }
  },
  {
    path: '/game/2048',
    name: 'Game2048',
    component: () => import('../views/Game2048.vue'),
    meta: { title: '2048' }
  },
  {
    path: '/game/snake',
    name: 'GameSnake',
    component: () => import('../views/GameSnake.vue'),
    meta: { title: '贪吃蛇' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' - 休闲游戏平台'
  }
  next()
})

export default router
