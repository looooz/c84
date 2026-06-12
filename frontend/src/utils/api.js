import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const request = axios.create({
  baseURL: API_BASE,
  timeout: 10000
})

request.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

export async function getScores() {
  return request.get('/scores')
}

export async function getScore(gameName) {
  return request.get(`/scores/${gameName}`)
}

export async function updateScore(gameName, score, playerName = '玩家') {
  return request.post(`/scores/${gameName}`, { score, playerName })
}

export async function checkHealth() {
  return request.get('/health')
}
