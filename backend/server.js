const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database', 'games.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到SQLite数据库');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS high_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_name TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL DEFAULT 0,
    player_name TEXT DEFAULT '玩家',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
    } else {
      console.log('high_scores 表已就绪');
      const games = ['2048', 'snake', 'tetris', 'bigfish'];
      games.forEach(game => {
        db.get('SELECT * FROM high_scores WHERE game_name = ?', [game], (err, row) => {
          if (!row) {
            db.run('INSERT INTO high_scores (game_name, score) VALUES (?, ?)', [game, 0]);
            console.log(`初始化 ${game} 最高分记录`);
          }
        });
      });
    }
  });
}

app.get('/api/scores', (req, res) => {
  db.all('SELECT game_name, score, player_name, updated_at FROM high_scores', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const scores = {};
    rows.forEach(row => {
      scores[row.game_name] = {
        score: row.score,
        playerName: row.player_name,
        updatedAt: row.updated_at
      };
    });
    res.json(scores);
  });
});

app.get('/api/scores/:game', (req, res) => {
  const game = req.params.game;
  db.get('SELECT game_name, score, player_name, updated_at FROM high_scores WHERE game_name = ?', [game], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '游戏不存在' });
      return;
    }
    res.json({
      gameName: row.game_name,
      score: row.score,
      playerName: row.player_name,
      updatedAt: row.updated_at
    });
  });
});

app.post('/api/scores/:game', (req, res) => {
  const game = req.params.game;
  const { score, playerName = '玩家' } = req.body;

  if (typeof score !== 'number' || score < 0) {
    res.status(400).json({ error: '无效的分数' });
    return;
  }

  db.get('SELECT score FROM high_scores WHERE game_name = ?', [game], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      db.run(
        'INSERT INTO high_scores (game_name, score, player_name) VALUES (?, ?, ?)',
        [game, score, playerName],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({
            gameName: game,
            score: score,
            playerName: playerName,
            isNewRecord: true,
            previousScore: 0
          });
        }
      );
    } else {
      const previousScore = row.score;
      const isNewRecord = score > previousScore;

      if (isNewRecord) {
        db.run(
          'UPDATE high_scores SET score = ?, player_name = ?, updated_at = CURRENT_TIMESTAMP WHERE game_name = ?',
          [score, playerName, game],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({
              gameName: game,
              score: score,
              playerName: playerName,
              isNewRecord: true,
              previousScore: previousScore
            });
          }
        );
      } else {
        res.json({
          gameName: game,
          score: score,
          playerName: playerName,
          isNewRecord: false,
          previousScore: previousScore,
          highScore: previousScore
        });
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`游戏平台后端服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`数据库文件: ${dbPath}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('数据库连接已关闭');
    process.exit(0);
  });
});
