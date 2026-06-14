const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'database', 'games.db')
console.log('数据库路径:', dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接失败:', err.message)
    process.exit(1)
  }
  console.log('✅ 数据库连接成功')
})

function step1_createTable() {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS high_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_name TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL DEFAULT 0,
      player_name TEXT DEFAULT '玩家',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) return reject(err)
      console.log('✅ high_scores 表已就绪')
      resolve()
    })
  })
}

function step2_insertAll() {
  const games = ['2048', 'snake', 'tetris', 'bigfish', 'blade', 'tank']
  const promises = games.map(game => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM high_scores WHERE game_name = ?', [game], (err, row) => {
        if (err) return reject(err)
        if (!row) {
          db.run('INSERT INTO high_scores (game_name, score, player_name) VALUES (?, ?, ?)', [game, 0, '玩家'], (e) => {
            if (e) return reject(e)
            console.log(`✅ 初始化 ${game} 记录`)
            resolve()
          })
        } else {
          console.log(`ℹ️  ${game} 已存在: score=${row.score}, player=${row.player_name}`)
          resolve()
        }
      })
    })
  })
  return Promise.all(promises)
}

function step3_showAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT game_name, score, player_name, updated_at FROM high_scores ORDER BY game_name', (err, rows) => {
      if (err) return reject(err)
      console.log('\n======= 所有最高分记录 =======')
      console.table(rows)
      resolve(rows)
    })
  })
}

async function main() {
  try {
    await step1_createTable()
    await step2_insertAll()
    await step3_showAll()
    console.log('\n🎉 数据库初始化完成')
  } catch (e) {
    console.error('❌ 错误:', e)
  } finally {
    db.close()
  }
}

main()
