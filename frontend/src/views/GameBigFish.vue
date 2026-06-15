<template>
  <div class="page-container game-bigfish" ref="pageRef">
    <div class="game-header">
      <button class="back-btn" @click="goBack"><el-icon :size="20"><ArrowLeft /></el-icon></button>
      <div class="game-title">🐟 大鱼吃小鱼</div>
      <button class="reset-btn" @click="resetGame">重置</button>
    </div>
    <div class="level-bar">
      <div class="level-name">{{ currentLevel.name }}</div>
      <div class="depth-indicator">深度 {{ currentLevel.depth }}m</div>
    </div>
    <div class="score-row">
      <div class="score-display"><div class="score-label">分数</div><div class="score-value">{{ score }}</div></div>
      <div class="score-display"><div class="score-label">最高</div><div class="score-value">{{ highScore }}</div></div>
      <div class="score-display"><div class="score-label">体型</div><div class="score-value">{{ fishSizeLevel }}</div></div>
    </div>
    <div class="game-canvas-wrapper">
      <canvas ref="canvasRef" class="game-canvas bigfish-canvas" @mousemove="handleMouseMove"
        @touchstart.prevent="handleTouchStart" @touchmove.prevent="handleTouchMove" @touchend.prevent="handleTouchEnd"></canvas>
      <div class="boss-hp-wrap" v-if="boss && boss.alive">
        <div class="boss-name">{{ boss.name }}</div>
        <div class="boss-hp-bar"><div class="boss-hp-fill" :style="{width: (boss.hp/boss.maxHp*100)+'%'}"></div></div>
      </div>
      <div class="powerup-icons" v-if="activePowerUps.length">
        <span v-for="p in activePowerUps" :key="p.type" class="pu-icon" :class="p.type">{{ p.icon }} {{ Math.ceil(p.remaining/1000) }}s</span>
      </div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-label">{{ progressLabel }}</div>
      <div class="progress-bar"><div class="progress-fill" :style="{width: progressPct+'%'}"></div></div>
    </div>
    <div class="game-overlay" v-if="showStartScreen">
      <div class="overlay-content">
        <div class="overlay-title">🐟 大鱼吃小鱼</div>
        <div class="overlay-desc">移动鼠标或触摸屏幕控制小鱼<br/>吃比你小的鱼成长，避开大鱼<br/>收集道具获得能力，击败Boss深入海底！</div>
        <button class="overlay-btn start" @click="startGame">开始游戏</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="game-overlay" v-if="gameWon">
      <div class="overlay-content">
        <div class="overlay-title">🏆 通关！深海之王！</div>
        <div class="overlay-score">最终得分：{{ score }}</div>
        <div class="overlay-level">恭喜你征服了所有5个海域！</div>
        <button class="overlay-btn" @click="resetAndStart">再玩一次</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <div class="game-overlay" v-if="gameOver && !gameWon">
      <div class="overlay-content">
        <div class="overlay-title gameover">💀 游戏结束</div>
        <div class="overlay-score">最终得分：{{ score }}</div>
        <div class="overlay-level">到达海域：{{ currentLevel.name }} (深度 {{ currentLevel.depth }}m)</div>
        <button class="overlay-btn" @click="resetAndStart">重新开始</button>
        <button class="overlay-btn secondary" @click="goBack">返回首页</button>
      </div>
    </div>
    <div class="level-transition" v-if="showTransition">{{ transitionText }}</div>
    <div class="control-panel">
      <button class="control-btn start-btn" @click="toggleGame" :class="{pause:isRunning&&!gameOver}">
        <el-icon :size="20"><component :is="isRunning&&!gameOver?'Pause':'VideoPlay'" /></el-icon>
        <span>{{ isRunning&&!gameOver?'暂停':(gameOver?'重新开始':'开始') }}</span>
      </button>
    </div>
    <div class="tips"><div class="tip-text">🎯 吃小鱼成长，避大鱼！吃道具获得能力，击败Boss深入海底！</div></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const pageRef = ref(null), canvasRef = ref(null)
const submitScore = inject('submitScore'), highScores = inject('highScores'), loadHighScores = inject('loadHighScores')

const BASE_PLAYER_SIZE = 28
const canvasSize = ref({ w: 360, h: 500 })
const score = ref(0), gameOver = ref(false), gameWon = ref(false), isRunning = ref(false)
const showStartScreen = ref(true)
const showTransition = ref(false), transitionText = ref('')
const currentLevelIdx = ref(0)
const activePowerUps = ref([])

const LEVELS = [
  { id:0, name:'浅海', depth:10, bgTop:'#4fc3f7', bgMid:'#0288d1', bgBottom:'#01579b', lightAlpha:0.12,
    fishTypes:['normal','jellyfish','pufferfish'], terrainType:'sand', hazardType:null, currentSpeed:0.3, currentDir:1,
    bossType:'crab', sizeThreshold:42, fishCount:6 },
  { id:1, name:'珊瑚礁', depth:50, bgTop:'#0288d1', bgMid:'#01579b', bgBottom:'#0d1b3e', lightAlpha:0.06,
    fishTypes:['normal','jellyfish','pufferfish','swordfish'], terrainType:'coral', hazardType:'urchin', currentSpeed:0.5, currentDir:-1,
    bossType:'eel', sizeThreshold:60, fishCount:7 },
  { id:2, name:'深海', depth:200, bgTop:'#01579b', bgMid:'#0d1b3e', bgBottom:'#050a18', lightAlpha:0.02,
    fishTypes:['normal','eel','jellyfish','swordfish'], terrainType:'rock', hazardType:'mine', currentSpeed:0.7, currentDir:1,
    bossType:'squid', sizeThreshold:82, fishCount:8 },
  { id:3, name:'海沟', depth:800, bgTop:'#0d1b3e', bgMid:'#050a18', bgBottom:'#010409', lightAlpha:0.005,
    fishTypes:['normal','eel','anglerfish','swordfish'], terrainType:'trench', hazardType:'current', currentSpeed:1.0, currentDir:-1,
    bossType:'anglerQueen', sizeThreshold:108, fishCount:6 },
  { id:4, name:'深渊', depth:2000, bgTop:'#050a18', bgMid:'#010409', bgBottom:'#000000', lightAlpha:0,
    fishTypes:['anglerfish','eel','normal'], terrainType:'abyss', hazardType:'vent', currentSpeed:0.6, currentDir:1,
    bossType:'leviathan', sizeThreshold:140, fishCount:5 }
]

const BOSS_DEFS = {
  crab: { name:'巨型螃蟹', size:55, hp:5, color1:'#e65100', color2:'#bf360c', speed:1.2 },
  eel: { name:'巨型海鳗', size:70, hp:8, color1:'#4a148c', color2:'#880e4f', speed:1.8 },
  squid: { name:'巨型乌贼', size:85, hp:12, color1:'#b71c1c', color2:'#880e4f', speed:1.5 },
  anglerQueen: { name:'灯笼鱼女王', size:95, hp:15, color1:'#1a237e', color2:'#311b92', speed:1.6 },
  leviathan: { name:'利维坦', size:120, hp:20, color1:'#000000', color2:'#1a237e', speed:1.3 }
}

const POWERUP_TYPES = [
  { type:'speed', icon:'⚡', duration:5000, color:'#ffeb3b' },
  { type:'shield', icon:'🛡️', duration:4000, color:'#2196f3' },
  { type:'magnet', icon:'🧲', duration:6000, color:'#e040fb' },
  { type:'shrink', icon:'🔻', duration:4000, color:'#4caf50' }
]

const currentLevel = computed(() => LEVELS[currentLevelIdx.value])
const highScore = computed(() => highScores['bigfish'] || 0)
const fishSizeLevel = computed(() => currentLevelIdx.value + 1)
const progressLabel = computed(() => {
  if (currentLevelIdx.value >= LEVELS.length - 1) return `🏆 最终关卡 - 击败Boss获胜！`
  return `${currentLevel.value.name} → ${LEVELS[currentLevelIdx.value+1].name} (体型 ${currentLevel.value.sizeThreshold})`
})
const progressPct = computed(() => {
  if (currentLevelIdx.value >= LEVELS.length - 1) return boss && boss.alive ? (1 - boss.hp/boss.maxHp)*100 : 0
  const prev = currentLevelIdx.value > 0 ? LEVELS[currentLevelIdx.value-1].sizeThreshold : BASE_PLAYER_SIZE
  const next = currentLevel.value.sizeThreshold
  return Math.min(100, (player.size - prev) / (next - prev) * 100)
})

let ctx = null, animationFrame = null, spawnTimer = null, lastTime = 0, scoreSubmitted = false
let terrainPoints = [], eatParticles = [], lightRays = [], stunTimer = 0, screenFlashAlpha = 0
const player = { x:0, y:0, targetX:0, targetY:0, size:BASE_PLAYER_SIZE, speed:5, facing:1, color:'#ffd700', shieldAlpha:0 }
let fishes = [], bubbles = [], powerUps = [], boss = null, bossSpawned = false
let keysDown = {}

const FISH_COLORS = [['#ff6b6b','#ee5253'],['#4ecdc4','#44a08d'],['#a29bfe','#6c5ce7'],['#fd79a8','#e84393'],
  ['#00b894','#00a085'],['#fdcb6e','#f39c12'],['#e17055','#d63031'],['#74b9ff','#0984e3']]

function rand(a,b){return Math.random()*(b-a)+a}
function randInt(a,b){return Math.floor(rand(a,b+1))}

function generateTerrain(){
  const w=canvasSize.value.w, h=canvasSize.value.h, type=currentLevel.value.terrainType
  terrainPoints=[]
  const baseY = h - 40
  for(let x=0;x<=w;x+=8){
    let y=baseY
    if(type==='sand') y=baseY+Math.sin(x*0.03)*8+Math.sin(x*0.07)*4
    else if(type==='coral') y=baseY+Math.sin(x*0.02)*12
    else if(type==='rock') y=baseY-Math.abs(Math.sin(x*0.015))*25+Math.sin(x*0.05)*8
    else if(type==='trench') y=baseY+Math.sin(x*0.008)*15
    else if(type==='abyss') y=baseY+Math.sin(x*0.01)*6
    terrainPoints.push({x,y})
  }
  lightRays=[]
  for(let i=0;i<6;i++) lightRays.push({x:rand(0,w),angle:rand(-0.3,0.3),width:rand(30,80),phase:rand(0,Math.PI*2)})
}

function createFish(){
  const side=Math.random()<0.5?'left':'right'
  const cW=canvasSize.value.w, cH=canvasSize.value.h
  const minS=Math.max(8,player.size*0.2), maxS=Math.min(cH*0.5,cW*0.3,player.size*2.5)
  const big=Math.random()<0.35
  let size=big?rand(Math.max(minS,player.size*1.1),maxS):rand(minS,Math.min(maxS,player.size*1.15))
  const types=currentLevel.value.fishTypes
  const type=types[randInt(0,types.length-1)]
  let y=rand(Math.max(size,cH*0.1),cH-size-50)
  const colors=FISH_COLORS[randInt(0,FISH_COLORS.length-1)]
  let speed=rand(1,3)*(1-(size-minS)/Math.max(1,maxS-minS)*0.5)
  const fish={x:side==='left'?-size*2:cW+size*2,y,size,speed:speed*(side==='left'?1:-1),facing:side==='left'?1:-1,
    color1:colors[0],color2:colors[1],tailPhase:rand(0,Math.PI*2),eaten:false,type,
    stunTimer:0,puffTimer:0,puffed:false,dartTimer:0,darting:false}
  if(type==='eel'){fish.size=size*1.4;fish.speed*=1.2}
  if(type==='swordfish'){fish.speed*=1.5;fish.dartTimer=rand(2000,5000)}
  if(type==='anglerfish'){fish.color1='#1a237e';fish.color2='#4fc3f7';fish.speed*=0.8}
  return fish
}

function createPowerUp(){
  const def=POWERUP_TYPES[randInt(0,POWERUP_TYPES.length-1)]
  return{x:rand(40,canvasSize.value.w-40),y:rand(40,canvasSize.value.h-100),type:def.type,icon:def.icon,
    color:def.color,duration:def.duration,size:18,alpha:1,phase:rand(0,Math.PI*2)}
}

function createBoss(){
  const def=BOSS_DEFS[currentLevel.value.bossType]
  const cW=canvasSize.value.w
  boss={...def,x:cW/2,y:80,hp:def.hp,maxHp:def.hp,alive:true,facing:1,tailPhase:0,
    attackTimer:rand(1500,3000),pattern:0,chargeDir:0,chargeTimer:0}
}

function createBubble(x,y){return{x:x+rand(-10,10),y,size:rand(2,6),speed:rand(0.5,1.5),alpha:rand(0.3,0.7),life:1}}

function drawFish(cx,x,y,size,facing,c1,c2,tail,isPlayer=false,type='normal',extra={}){
  const s=size,tailOff=Math.sin(tail)*s*0.2
  cx.save();cx.translate(x,y);cx.scale(facing,1)
  if(isPlayer){cx.shadowColor='#ffd700';cx.shadowBlur=15}
  if(type==='eel'){
    cx.fillStyle=c1;cx.beginPath()
    for(let i=0;i<8;i++){const t=i/7,bx=-s*0.8+t*s*1.6,by=Math.sin(tail+t*4)*s*0.1;cx.lineTo(bx,by+s*0.12)}
    for(let i=7;i>=0;i--){const t=i/7,bx=-s*0.8+t*s*1.6,by=Math.sin(tail+t*4)*s*0.1;cx.lineTo(bx,by-s*0.12)}
    cx.closePath();cx.fill()
    cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.6,-s*0.02,s*0.08,0,Math.PI*2);cx.fill()
    cx.fillStyle='#000';cx.beginPath();cx.arc(s*0.63,-s*0.02,s*0.04,0,Math.PI*2);cx.fill()
    if(stunTimer>0){cx.fillStyle='rgba(0,150,255,0.4)';cx.fillRect(-s,-s*0.3,s*2,s*0.6)}
  } else if(type==='jellyfish'){
    cx.globalAlpha=0.6;cx.fillStyle=c1;cx.beginPath()
    cx.arc(0,-s*0.2,s*0.5,Math.PI,0);cx.closePath();cx.fill()
    cx.strokeStyle=c2;cx.lineWidth=2;cx.globalAlpha=0.4
    for(let i=0;i<5;i++){const tx=-s*0.3+i*s*0.15;cx.beginPath();cx.moveTo(tx,-s*0.2)
      cx.quadraticCurveTo(tx+Math.sin(tail+i)*5,0,tx+Math.sin(tail+i*1.3)*8,s*0.5);cx.stroke()}
  } else if(type==='pufferfish'){
    const rad=extra.puffed?s*1.3:s
    const bg=cx.createRadialGradient(0,-s*0.1,s*0.2,0,0,rad*0.5)
    bg.addColorStop(0,c1);bg.addColorStop(1,c2);cx.fillStyle=bg
    cx.beginPath();cx.arc(0,0,rad*0.5,0,Math.PI*2);cx.fill()
    if(true){cx.strokeStyle=c2;cx.lineWidth=1.5
      for(let i=0;i<8;i++){const a=i*Math.PI/4;cx.beginPath()
        cx.moveTo(Math.cos(a)*rad*0.4,Math.sin(a)*rad*0.4)
        cx.lineTo(Math.cos(a)*rad*0.55,Math.sin(a)*rad*0.55);cx.stroke()}}
    cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.15,-s*0.1,s*0.12,0,Math.PI*2);cx.fill()
    cx.fillStyle='#000';cx.beginPath();cx.arc(s*0.18,-s*0.1,s*0.06,0,Math.PI*2);cx.fill()
  } else if(type==='swordfish'){
    const bg=cx.createLinearGradient(-s,0,s,0);bg.addColorStop(0,c2);bg.addColorStop(1,c1);cx.fillStyle=bg
    cx.beginPath();cx.ellipse(0,0,s*0.7,s*0.25,0,0,Math.PI*2);cx.fill()
    cx.fillStyle=c1;cx.beginPath();cx.moveTo(s*0.7,0);cx.lineTo(s*1.4,-s*0.03);cx.lineTo(s*1.4,s*0.03);cx.closePath();cx.fill()
    cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.3,-s*0.08,s*0.06,0,Math.PI*2);cx.fill()
    cx.fillStyle='#000';cx.beginPath();cx.arc(s*0.32,-s*0.08,s*0.03,0,Math.PI*2);cx.fill()
  } else if(type==='anglerfish'){
    const bg=cx.createRadialGradient(0,0,s*0.2,0,0,s*0.6);bg.addColorStop(0,c2);bg.addColorStop(1,c1)
    cx.fillStyle=bg;cx.beginPath();cx.ellipse(0,0,s*0.6,s*0.5,0,0,Math.PI*2);cx.fill()
    cx.fillStyle=c1;cx.beginPath();cx.moveTo(-s*0.5,0);cx.lineTo(-s*0.9,-s*0.3+tailOff);cx.lineTo(-s*0.7,0)
    cx.lineTo(-s*0.9,s*0.3+tailOff);cx.closePath();cx.fill()
    cx.strokeStyle=c2;cx.lineWidth=2;cx.beginPath();cx.moveTo(s*0.3,-s*0.4)
    cx.quadraticCurveTo(s*0.5,-s*0.7,s*0.3,-s*0.8);cx.stroke()
    cx.shadowColor=c2;cx.shadowBlur=15;cx.fillStyle=c2;cx.beginPath();cx.arc(s*0.3,-s*0.8,s*0.1,0,Math.PI*2);cx.fill()
    cx.shadowBlur=0;cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.25,-s*0.1,s*0.1,0,Math.PI*2);cx.fill()
    cx.fillStyle='#000';cx.beginPath();cx.arc(s*0.28,-s*0.1,s*0.05,0,Math.PI*2);cx.fill()
  } else {
    const bg=cx.createRadialGradient(0,-s*0.1,s*0.2,0,0,s);bg.addColorStop(0,c1);bg.addColorStop(1,c2);cx.fillStyle=bg
    cx.beginPath();cx.ellipse(0,0,s*0.9,s*0.6,0,0,Math.PI*2);cx.fill()
    cx.fillStyle=c2;cx.beginPath();cx.moveTo(-s*0.85,0);cx.lineTo(-s*1.5,-s*0.5+tailOff)
    cx.lineTo(-s*1.3,0);cx.lineTo(-s*1.5,s*0.5+tailOff);cx.closePath();cx.fill()
    cx.fillStyle=c1;cx.beginPath();cx.ellipse(s*0.3,-s*0.55,s*0.25,s*0.15,-0.4,0,Math.PI*2);cx.fill()
    cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.45,-s*0.15,s*0.18,0,Math.PI*2);cx.fill()
    cx.fillStyle='#000';cx.beginPath();cx.arc(s*0.5,-s*0.15,s*0.09,0,Math.PI*2);cx.fill()
    cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.53,-s*0.18,s*0.035,0,Math.PI*2);cx.fill()
  }
  if(isPlayer){cx.strokeStyle='rgba(255,255,255,0.6)';cx.lineWidth=1.5;cx.beginPath()
    cx.moveTo(s*0.25,s*0.1);cx.quadraticCurveTo(s*0.5,s*0.25,s*0.7,s*0.1);cx.stroke()}
  cx.restore()
}

function drawBoss(cx){
  if(!boss||!boss.alive)return
  const s=boss.size
  cx.save();cx.translate(boss.x,boss.y);cx.scale(boss.facing,1)
  const bg=cx.createRadialGradient(0,0,s*0.2,0,0,s);bg.addColorStop(0,boss.color1);bg.addColorStop(1,boss.color2)
  cx.fillStyle=bg;cx.shadowColor=boss.color2;cx.shadowBlur=20
  cx.beginPath();cx.ellipse(0,0,s*0.8,s*0.55,0,0,Math.PI*2);cx.fill()
  cx.shadowBlur=0;cx.fillStyle=boss.color1
  cx.beginPath();cx.moveTo(-s*0.7,0);cx.lineTo(-s*1.3,-s*0.4+Math.sin(boss.tailPhase)*s*0.15)
  cx.lineTo(-s*1.1,0);cx.lineTo(-s*1.3,s*0.4+Math.sin(boss.tailPhase)*s*0.15);cx.closePath();cx.fill()
  cx.fillStyle='#ff0000';cx.beginPath();cx.arc(s*0.35,-s*0.12,s*0.1,0,Math.PI*2);cx.fill()
  cx.fillStyle='#fff';cx.beginPath();cx.arc(s*0.37,-s*0.14,s*0.03,0,Math.PI*2);cx.fill()
  if(boss.chargeTimer>0){cx.strokeStyle='rgba(255,0,0,0.5)';cx.lineWidth=3;cx.beginPath()
    cx.moveTo(s*0.5,0);cx.lineTo(s*2,0);cx.stroke()}
  cx.restore()
}

function drawBackground(){
  const w=canvasSize.value.w,h=canvasSize.value.h,lv=currentLevel.value,t=performance.now()/1000
  const grad=ctx.createLinearGradient(0,0,0,h)
  grad.addColorStop(0,lv.bgTop);grad.addColorStop(0.5,lv.bgMid);grad.addColorStop(1,lv.bgBottom)
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h)
  ctx.save()
  lightRays.forEach(r=>{
    if(lv.lightAlpha<=0)return
    const a=lv.lightAlpha*(0.5+0.5*Math.sin(t+r.phase))
    const rg=ctx.createLinearGradient(r.x,0,r.x+r.angle*h,h)
    rg.addColorStop(0,`rgba(255,255,255,${a})`);rg.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=rg;ctx.beginPath();ctx.moveTo(r.x,0);ctx.lineTo(r.x+r.width,0)
    ctx.lineTo(r.x+r.width+r.angle*h*2,h);ctx.lineTo(r.x+r.angle*h*2,h);ctx.closePath();ctx.fill()
  })
  ctx.restore()
  if(currentLevelIdx.value>=3){
    ctx.save();ctx.globalAlpha=0.3
    for(let i=0;i<8;i++){const bx=(t*20+i*50)%w,by=h*0.3+Math.sin(t+i)*40
      ctx.fillStyle=`rgba(0,255,${150+i*10},0.4)`;ctx.beginPath();ctx.arc(bx,by,3+Math.sin(t*2+i),0,Math.PI*2);ctx.fill()}
    ctx.restore()
  }
  if(currentLevelIdx.value>=2){
    ctx.save();ctx.globalAlpha=0.08;ctx.fillStyle='#4fc3f7'
    for(let i=0;i<5;i++){const px=(t*15+i*70)%w,py=h*0.2+i*30+Math.sin(t+i)*20
      ctx.beginPath();ctx.arc(px,py,2+Math.sin(t*3+i)*1,0,Math.PI*2);ctx.fill()}
    ctx.restore()
  }
}

function drawTerrain(){
  const h=canvasSize.value.h,type=currentLevel.value.terrainType,t=performance.now()/1000
  if(terrainPoints.length<2)return
  ctx.save()
  if(type==='sand'){
    ctx.fillStyle='#c2a64e';ctx.beginPath();ctx.moveTo(0,h);terrainPoints.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(canvasSize.value.w,h);ctx.closePath();ctx.fill()
    ctx.fillStyle='#d4b96a';ctx.globalAlpha=0.5
    for(let i=0;i<6;i++){const sx=(i*60+t*5)%canvasSize.value.w,sy=h-35+Math.sin(i)*5
      ctx.beginPath();ctx.ellipse(sx,sy,3,2,0,0,Math.PI*2);ctx.fill()}
  } else if(type==='coral'){
    ctx.fillStyle='#5d4037';ctx.beginPath();ctx.moveTo(0,h);terrainPoints.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(canvasSize.value.w,h);ctx.closePath();ctx.fill()
    ctx.globalAlpha=0.8
    for(let i=0;i<5;i++){const cx=i*75+20,ch=20+Math.sin(i*2)*10
      ctx.fillStyle=i%2?'#e91e63':'#ff5722';ctx.beginPath()
      ctx.moveTo(cx,h-35);ctx.quadraticCurveTo(cx-8,h-35-ch,cx-3,h-35-ch*1.2)
      ctx.quadraticCurveTo(cx,h-35-ch*1.5,cx+3,h-35-ch*1.2)
      ctx.quadraticCurveTo(cx+8,h-35-ch,cx,h-35);ctx.fill()}
  } else if(type==='rock'){
    ctx.fillStyle='#37474f';ctx.beginPath();ctx.moveTo(0,h);terrainPoints.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(canvasSize.value.w,h);ctx.closePath();ctx.fill()
  } else if(type==='trench'){
    ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.moveTo(0,h);terrainPoints.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(canvasSize.value.w,h);ctx.closePath();ctx.fill()
  } else if(type==='abyss'){
    ctx.fillStyle='#0a0a0a';ctx.beginPath();ctx.moveTo(0,h);terrainPoints.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(canvasSize.value.w,h);ctx.closePath();ctx.fill()
    for(let i=0;i<3;i++){const vx=i*120+30,vy=h-30
      const vg=ctx.createRadialGradient(vx,vy,0,vx,vy,25)
      vg.addColorStop(0,'rgba(255,100,0,0.3)');vg.addColorStop(1,'rgba(255,50,0,0)')
      ctx.fillStyle=vg;ctx.fillRect(vx-25,vy-25,50,30)}
  }
  ctx.restore()
}

function drawCurrents(){
  const lv=currentLevel.value,t=performance.now()/1000
  if(lv.currentSpeed<=0)return
  ctx.save();ctx.globalAlpha=0.15;ctx.strokeStyle='rgba(200,220,255,0.5)';ctx.lineWidth=1.5
  for(let i=0;i<4;i++){
    const y=canvasSize.value.h*0.2+i*canvasSize.value.h*0.2
    ctx.beginPath()
    for(let x=0;x<canvasSize.value.w;x+=4){
      const ox=x+lv.currentDir*t*lv.currentSpeed*60
      const oy=y+Math.sin(ox*0.02+i)*15
      x===0?ctx.moveTo(x,oy):ctx.lineTo(x,oy)}
    ctx.stroke()}
  ctx.restore()
}

function drawBubbles(){
  bubbles.forEach(b=>{ctx.save();ctx.globalAlpha=b.alpha*b.life
    ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2)
    ctx.stroke();ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fill();ctx.restore()})
}

function drawPowerUps(){
  const t=performance.now()/1000
  powerUps.forEach(p=>{
    ctx.save();ctx.globalAlpha=0.8+0.2*Math.sin(t*3+p.phase)
    const py=p.y+Math.sin(t*2+p.phase)*8
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=12
    ctx.beginPath();ctx.arc(p.x,py,p.size,0,Math.PI*2);ctx.fill()
    ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font=`${p.size}px serif`;ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText(p.icon,p.x,py)
    ctx.restore()})
}

function drawEatParticles(){
  eatParticles.forEach(p=>{ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.color
    ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();ctx.restore()})
}

function drawStunEffect(){
  if(stunTimer<=0)return
  ctx.save();ctx.globalAlpha=0.3*(stunTimer/2000);ctx.fillStyle='#00bfff'
  ctx.fillRect(0,0,canvasSize.value.w,canvasSize.value.h);ctx.restore()
}

function drawScreenFlash(){
  if(screenFlashAlpha<=0)return
  ctx.save();ctx.globalAlpha=screenFlashAlpha;ctx.fillStyle='#fff'
  ctx.fillRect(0,0,canvasSize.value.w,canvasSize.value.h);ctx.restore()
}

function draw(){
  if(!ctx)return
  drawBackground();drawTerrain();drawCurrents();drawBubbles();drawPowerUps()
  fishes.forEach(f=>{if(!f.eaten){const big=f.size>player.size*1.05
    const c1=f.type==='eel'?(big?'#ff4444':'#7c4dff'):big?'#ff4444':f.color1
    const c2=f.type==='eel'?(big?'#cc2222':'#651fff'):big?'#cc2222':f.color2
    drawFish(ctx,f.x,f.y,f.size,f.facing,c1,c2,f.tailPhase,false,f.type,{puffed:f.puffed})}})
  drawBoss(ctx)
  if(!gameOver.value){
    const shielded=activePowerUps.value.some(p=>p.type==='shield')
    drawFish(ctx,player.x,player.y,player.size,player.facing,'#ffd700','#ffaa00',performance.now()/100,true,'normal')
    if(shielded){ctx.save();ctx.strokeStyle='rgba(33,150,243,0.6)';ctx.lineWidth=3
      ctx.beginPath();ctx.arc(player.x,player.y,player.size*1.1,0,Math.PI*2);ctx.stroke();ctx.restore()}}
  drawEatParticles();drawStunEffect();drawScreenFlash()
  if(gameOver.value){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,canvasSize.value.w,canvasSize.value.h)}
}

function hasPowerUp(type){return activePowerUps.value.some(p=>p.type===type)}
function getEffSize(){return hasPowerUp('shrink')?player.size*0.6:player.size}
function getEffSpeed(){return hasPowerUp('speed')?player.speed*1.6:player.speed}

function checkCollision(fish){
  const ps=getEffSize()
  const dx=player.x-fish.x,dy=player.y-fish.y,d=Math.sqrt(dx*dx+dy*dy)
  return d<(ps+fish.size)*0.55
}

function checkBossCollision(){
  if(!boss||!boss.alive)return
  const ps=getEffSize(),dx=player.x-boss.x,dy=player.y-boss.y,d=Math.sqrt(dx*dx+dy*dy)
  return d<(ps+boss.size)*0.55
}

function handleSpecialFish(fish){
  if(fish.type==='eel'&&stunTimer<=0){stunTimer=1500;screenFlashAlpha=0.3}
  if(fish.type==='jellyfish'){
    const dx=player.x-fish.x,dy=player.y-fish.y,d=Math.sqrt(dx*dx+dy*dy)||1
    player.x+=dx/d*30;player.y+=dy/d*30;if(!hasPowerUp('shield'))player.size=Math.max(BASE_PLAYER_SIZE*0.5,player.size-3)
    screenFlashAlpha=0.2}
  if(fish.type==='pufferfish'){fish.puffed=true;fish.size*=1.3;return false}
  return true
}

function update(dt){
  const cW=canvasSize.value.w,cH=canvasSize.value.h,lv=currentLevel.value,es=getEffSize(),esp=getEffSpeed()
  if(stunTimer>0){stunTimer-=dt;player.speed=Math.max(1,esp*0.3)}else{player.speed=esp}
  if(screenFlashAlpha>0)screenFlashAlpha=Math.max(0,screenFlashAlpha-0.02)

  const dx=player.targetX-player.x,dy=player.targetY-player.y,dist=Math.sqrt(dx*dx+dy*dy)
  if(dist>2&&stunTimer<=0){
    const ms=Math.min(player.speed,dist*0.15)
    player.x+=dx/dist*ms;player.y+=dy/dist*ms
    if(Math.abs(dx)>1)player.facing=dx>0?1:-1}
  player.x+=lv.currentDir*lv.currentSpeed*0.5
  player.x=Math.max(es,Math.min(cW-es,player.x));player.y=Math.max(es,Math.min(cH-es,player.y))

  const magnetRange=hasPowerUp('magnet')?150:0
  fishes.forEach(f=>{
    if(f.eaten)return
    f.x+=f.speed;f.tailPhase+=0.15
    if(lv.currentSpeed>0)f.y+=Math.sin(performance.now()/500+f.x*0.01)*lv.currentSpeed*0.3
    if(f.type==='pufferfish'&&!f.puffed){
      const dd=Math.sqrt((player.x-f.x)**2+(player.y-f.y)**2)
      if(dd<player.size*3){f.puffed=true;f.size*=1.3}}
    if(f.type==='swordfish'&&!f.darting){f.dartTimer-=dt
      if(f.dartTimer<=0){f.darting=true;f.speed*=2.5;f.dartTimer=3000}}
    if(f.type==='swordfish'&&f.darting){f.dartTimer-=dt;if(f.dartTimer<=0){f.darting=false;f.speed/=2.5;f.dartTimer=rand(2000,4000)}}
    if(f.type==='anglerfish'){const adx=player.x-f.x;f.facing=adx>0?1:-1}
    if(magnetRange>0&&f.size<es){const mdx=player.x-f.x,mdy=player.y-f.y,md=Math.sqrt(mdx*mdx+mdy*mdy)
      if(md<magnetRange&&md>1){f.x+=mdx/md*2;f.y+=mdy/md*2}}
    if(checkCollision(f)){
      if(f.size<=es*0.95){
        if(f.puffed&&!hasPowerUp('shield')){gameOver.value=true;isRunning.value=false;stopGame();handleGameOver();return}
        const dangerous=handleSpecialFish(f);if(dangerous===false)return
        f.eaten=true;const sg=f.size*0.1;player.size=Math.min(cW*0.35,player.size+sg)
        player.speed=Math.max(2,5-(player.size-BASE_PLAYER_SIZE)*0.02);score.value+=Math.floor(f.size*2)
        for(let i=0;i<8;i++)eatParticles.push({x:f.x+rand(-10,10),y:f.y+rand(-10,10),size:rand(3,7),
          color:f.color1,vx:rand(-3,3),vy:rand(-3,3),life:1})
        for(let i=0;i<5;i++)bubbles.push(createBubble(f.x,f.y))
      } else if(f.size>es*1.05){
        if(hasPowerUp('shield')){f.eaten=true;score.value+=Math.floor(f.size);return}
        gameOver.value=true;isRunning.value=false;stopGame();handleGameOver()}}})

  if(boss&&boss.alive){
    boss.tailPhase+=0.1
    const bdx=player.x-boss.x,bdy=player.y-boss.y
    boss.facing=bdx>0?1:-1
    if(boss.chargeTimer>0){boss.x+=boss.facing*4;boss.chargeTimer-=dt}
    else{boss.x+=(bdx/(Math.sqrt(bdx*bdx+bdy*bdy)||1))*boss.speed
      boss.y+=(bdy/(Math.sqrt(bdx*bdx+bdy*bdy)||1))*boss.speed*0.5
      boss.attackTimer-=dt
      if(boss.attackTimer<=0){boss.chargeTimer=800;boss.attackTimer=rand(2000,4000)}}
    boss.x=Math.max(boss.size,Math.min(cW-boss.size,boss.x));boss.y=Math.max(boss.size,Math.min(cH*0.6,boss.y))
    if(checkBossCollision()){
      if(getEffSize()>boss.size*0.7||hasPowerUp('shield')){
        boss.hp--;screenFlashAlpha=0.15
        if(boss.hp<=0){boss.alive=false;score.value+=boss.maxHp*100
          for(let i=0;i<20;i++)eatParticles.push({x:boss.x+rand(-20,20),y:boss.y+rand(-20,20),size:rand(4,10),
            color:boss.color1,vx:rand(-4,4),vy:rand(-4,4),life:1})
          if(currentLevelIdx.value>=LEVELS.length-1){gameWon.value=true;isRunning.value=false;stopGame();handleGameOver()}}}
      else if(!hasPowerUp('shield')){gameOver.value=true;isRunning.value=false;stopGame();handleGameOver()}}}

  if(!bossSpawned&&player.size>=currentLevel.value.sizeThreshold*0.9){
    bossSpawned=true;createBoss()}

  if(currentLevelIdx.value<LEVELS.length-1&&player.size>=currentLevel.value.sizeThreshold){
    advanceLevel()}

  fishes=fishes.filter(f=>{if(f.eaten)return false
    if(f.speed>0&&f.x>cW+f.size*2)return false;if(f.speed<0&&f.x<-f.size*2)return false;return true})
  while(fishes.filter(f=>!f.eaten).length<lv.fishCount)fishes.push(createFish())

  powerUps.forEach(p=>{p.y+=Math.sin(performance.now()/500+p.phase)*0.3})
  powerUps.forEach(p=>{const pdx=player.x-p.x,pdy=player.y-p.y
    if(Math.sqrt(pdx*pdx+pdy*pdy)<player.size+p.size){
      const def=POWERUP_TYPES.find(t=>t.type===p.type)
      activePowerUps.value.push({type:p.type,icon:p.icon,remaining:def.duration,color:p.color})
      p.collected=true;score.value+=50}})
  powerUps=powerUps.filter(p=>!p.collected)

  activePowerUps.value.forEach(p=>p.remaining-=dt)
  activePowerUps.value=activePowerUps.value.filter(p=>p.remaining>0)

  eatParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=0.03})
  eatParticles=eatParticles.filter(p=>p.life>0)

  bubbles.forEach(b=>{b.y-=b.speed;b.life-=0.01})
  bubbles=bubbles.filter(b=>b.life>0&&b.y>-10)
  if(Math.random()<0.04)bubbles.push({x:rand(0,cW),y:cH+5,size:rand(2,5),speed:rand(0.3,1),alpha:rand(0.2,0.5),life:1})
}

function advanceLevel(){
  if(currentLevelIdx.value>=LEVELS.length-1)return
  currentLevelIdx.value++;boss=null;bossSpawned=false
  generateTerrain()
  showTransition.value=true;transitionText.value=`⬇ 进入 ${currentLevel.value.name} (${currentLevel.value.depth}m) ⬇`
  setTimeout(()=>showTransition.value=false,2000)
}

function loop(ts){
  if(!isRunning.value)return
  const dt=Math.min(ts-lastTime,50);lastTime=ts
  update(dt);draw();animationFrame=requestAnimationFrame(loop)
}

function spawnFish(){
  if(!isRunning.value)return
  if(fishes.filter(f=>!f.eaten).length<currentLevel.value.fishCount+3)fishes.push(createFish())
  if(Math.random()<0.02&&powerUps.length<2)powerUps.push(createPowerUp())
  spawnTimer=setTimeout(spawnFish,800+rand(-200,200))
}

function initGame(){
  fishes=[];bubbles=[];powerUps=[];eatParticles=[];boss=null;bossSpawned=false
  currentLevelIdx.value=0;activePowerUps.value=[]
  score.value=0;gameOver.value=false;gameWon.value=false;isRunning.value=false;scoreSubmitted=false
  stunTimer=0;screenFlashAlpha=0;showTransition.value=false
  player.x=canvasSize.value.w/2;player.y=canvasSize.value.h/2;player.targetX=player.x;player.targetY=player.y
  player.size=BASE_PLAYER_SIZE;player.speed=5;player.facing=1
  generateTerrain()
  for(let i=0;i<4;i++)fishes.push(createFish())
  draw()
}

function startGame(){
  showStartScreen.value=false
  if(gameOver.value||gameWon.value)initGame()
  isRunning.value=true;lastTime=performance.now()
  animationFrame=requestAnimationFrame(loop);spawnTimer=setTimeout(spawnFish,500)
}
function resetAndStart(){
  resetGame()
  startGame()
}
function pauseGame(){isRunning.value=false;if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=null}
  if(spawnTimer){clearTimeout(spawnTimer);spawnTimer=null}}
function stopGame(){if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=null}
  if(spawnTimer){clearTimeout(spawnTimer);spawnTimer=null}}
function toggleGame(){if(gameOver.value||gameWon.value){resetGame();return}
  isRunning.value?pauseGame():startGame()}
function resetGame(){stopGame();initGame()}

async function handleGameOver(){
  if(!scoreSubmitted&&score.value>0){scoreSubmitted=true;await submitScore('bigfish',score.value)}}
async function goBack(){stopGame();if(!gameOver.value&&score.value>0&&!scoreSubmitted){scoreSubmitted=true;try{await submitScore('bigfish',score.value)}catch(e){console.error('提交分数失败:',e)}}
  router.push({path:'/home'})}

function getCanvasPos(cx,cy){const r=canvasRef.value.getBoundingClientRect()
  return{x:(cx-r.left)*canvasSize.value.w/r.width,y:(cy-r.top)*canvasSize.value.h/r.height}}
function handleMouseMove(e){if(!isRunning.value)return;const p=getCanvasPos(e.clientX,e.clientY);player.targetX=p.x;player.targetY=p.y}

let touchActive=false
function handleTouchStart(e){touchActive=true;if(e.touches.length>0){const p=getCanvasPos(e.touches[0].clientX,e.touches[0].clientY)
  player.targetX=p.x;player.targetY=p.y;if(!isRunning.value&&!gameOver.value)startGame()}}
function handleTouchMove(e){if(!touchActive||e.touches.length===0)return
  const p=getCanvasPos(e.touches[0].clientX,e.touches[0].clientY);player.targetX=p.x;player.targetY=p.y}
function handleTouchEnd(){touchActive=false}

function handleKeydown(e){
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' ','r','R'].includes(e.key))e.preventDefault()
  keysDown[e.key]=true;const ms=20
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')player.targetX=Math.max(player.size,player.targetX-ms)
  else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')player.targetX=Math.min(canvasSize.value.w-player.size,player.targetX+ms)
  else if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')player.targetY=Math.max(player.size,player.targetY-ms)
  else if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')player.targetY=Math.min(canvasSize.value.h-player.size,player.targetY+ms)
  else if(e.key===' ')toggleGame();else if(e.key==='r'||e.key==='R')resetGame()}

function handleKeyup(e){keysDown[e.key]=false}

function resizeCanvas(){
  const sw=window.innerWidth,sh=window.innerHeight
  const headerH=76,levelH=36,scoreH=80,controlH=70,tipsH=60,marginsH=32
  const safeB=getSafeAreaBottom()
  const occ=headerH+levelH+scoreH+controlH+tipsH+marginsH+safeB
  const maxH=Math.max(280,sh-occ),maxW=Math.min(sw-40,sh*0.7)
  const ratio=360/500;let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio}
  canvasSize.value={w,h}
  if(canvasRef.value){const dpr=window.devicePixelRatio||1;canvasRef.value.width=w*dpr;canvasRef.value.height=h*dpr
    canvasRef.value.style.width=w+'px';canvasRef.value.style.height=h+'px'
    ctx=canvasRef.value.getContext('2d');ctx.scale(dpr,dpr)}
  player.x=Math.min(player.x,w-player.size);player.y=Math.min(player.y,h-player.size)
  player.targetX=Math.min(player.targetX,w-player.size);player.targetY=Math.min(player.targetY,h-player.size)
  generateTerrain()}

function getSafeAreaBottom(){return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom'))||0}

onMounted(()=>{loadHighScores();nextTick(()=>{resizeCanvas();initGame()})
  window.addEventListener('keydown',handleKeydown);window.addEventListener('keyup',handleKeyup)
  window.addEventListener('resize',()=>nextTick(()=>{resizeCanvas();draw()}))})
onUnmounted(()=>{stopGame();window.removeEventListener('keydown',handleKeydown);window.removeEventListener('keyup',handleKeyup)})
</script>

<style scoped>
.game-bigfish{background:linear-gradient(135deg,#0d1b3e 0%,#01579b 50%,#010409 100%);display:flex;flex-direction:column;align-items:center;padding:0}
.game-header{width:100%;display:flex;justify-content:space-between;align-items:center;padding:16px 20px}
.back-btn{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:white;display:flex;justify-content:center;align-items:center;cursor:pointer;backdrop-filter:blur(10px);transition:all .2s}
.back-btn:active,.reset-btn:active{transform:scale(.9);background:rgba(255,255,255,.3)}
.game-title{font-size:22px;font-weight:800;color:white}
.reset-btn{padding:10px 20px;border-radius:22px;background:rgba(255,255,255,.2);border:none;color:white;font-weight:600;font-size:14px;cursor:pointer;backdrop-filter:blur(10px);transition:all .2s}
.level-bar{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 20px 8px;gap:10px}
.level-name{font-size:16px;font-weight:700;color:#4fc3f7;text-shadow:0 0 8px rgba(79,195,247,.5)}
.depth-indicator{font-size:13px;color:rgba(255,255,255,.7);font-weight:600}
.score-row{display:flex;gap:10px;margin-bottom:12px;padding:0 20px}
.score-row .score-display{min-width:80px;padding:10px 14px}
.score-row .score-value{font-size:22px}
.game-canvas-wrapper{padding:0;position:relative}
.bigfish-canvas{cursor:none}
.boss-hp-wrap{position:absolute;top:8px;left:50%;transform:translateX(-50%);width:70%;z-index:2}
.boss-name{font-size:12px;color:#ff5252;font-weight:700;text-align:center;margin-bottom:3px;text-shadow:0 0 6px rgba(255,82,82,.5)}
.boss-hp-bar{width:100%;height:8px;background:rgba(0,0,0,.5);border-radius:4px;overflow:hidden;border:1px solid rgba(255,82,82,.3)}
.boss-hp-fill{height:100%;background:linear-gradient(90deg,#ff5252,#d32f2f);border-radius:4px;transition:width .2s;box-shadow:0 0 8px rgba(255,82,82,.5)}
.powerup-icons{position:absolute;top:8px;left:8px;display:flex;gap:6px;z-index:2}
.pu-icon{font-size:11px;padding:3px 8px;border-radius:12px;background:rgba(0,0,0,.5);color:white;font-weight:600;backdrop-filter:blur(4px)}
.pu-icon.speed{border:1px solid #ffeb3b}.pu-icon.shield{border:1px solid #2196f3}
.pu-icon.magnet{border:1px solid #e040fb}.pu-icon.shrink{border:1px solid #4caf50}
.progress-bar-wrap{margin-top:10px;width:100%;padding:0 20px;box-sizing:border-box}
.progress-label{font-size:12px;color:rgba(255,255,255,.9);margin-bottom:5px;text-align:center;font-weight:600}
.progress-bar{width:100%;height:8px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;backdrop-filter:blur(10px)}
.progress-fill{height:100%;background:linear-gradient(90deg,#4fc3f7,#0288d1);border-radius:4px;transition:width .3s;box-shadow:0 0 8px rgba(79,195,247,.5)}
.game-status{margin-top:10px;text-align:center;color:white}
.status-text{font-size:22px;font-weight:700;margin-bottom:4px}
.status-score{font-size:15px;opacity:.9}
.level-transition{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:800;color:#4fc3f7;text-shadow:0 0 20px rgba(79,195,247,.8);z-index:10;animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)}50%{opacity:.7;transform:translate(-50%,-50%) scale(1.05)}}
.control-panel{margin-top:14px}
.control-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 40px;border-radius:30px;border:none;font-size:18px;font-weight:700;cursor:pointer;transition:all .2s}
.start-btn{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);color:white;box-shadow:0 4px 15px rgba(245,87,108,.4)}
.start-btn.pause{background:linear-gradient(135deg,#ffa751 0%,#ffe259 100%);box-shadow:0 4px 15px rgba(255,167,81,.4)}
.start-btn:active{transform:scale(.95)}
.tips{margin-top:10px;padding-left:20px;padding-right:20px;padding-bottom:calc(36px + env(safe-area-inset-bottom))}
.tip-text{font-size:13px;color:rgba(255,255,255,.85);text-align:center;padding:8px 16px;background:rgba(255,255,255,.1);border-radius:20px;backdrop-filter:blur(10px)}

.game-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(5px)}
.overlay-content{background:linear-gradient(135deg,rgba(255,255,255,.15) 0%,rgba(255,255,255,.05) 100%);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:32px 28px;text-align:center;color:white;max-width:320px;width:85%;backdrop-filter:blur(10px);box-shadow:0 20px 60px rgba(0,0,0,.3)}
.overlay-title{font-size:28px;font-weight:800;margin-bottom:12px;letter-spacing:1px}
.overlay-title.gameover{color:#ff6b6b}
.overlay-desc{font-size:14px;opacity:.9;margin-bottom:20px;line-height:1.8}
.overlay-score{font-size:20px;font-weight:700;margin-bottom:8px}
.overlay-level{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.6}
.overlay-btn{width:100%;padding:14px 24px;border-radius:14px;border:none;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s ease;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);color:white;box-shadow:0 4px 15px rgba(251,191,36,.4)}
.overlay-btn.start{background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);box-shadow:0 4px 15px rgba(34,197,94,.4)}
.overlay-btn.secondary{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:white;box-shadow:none;margin-top:10px}
.overlay-btn:active{transform:scale(.95)}
</style>
