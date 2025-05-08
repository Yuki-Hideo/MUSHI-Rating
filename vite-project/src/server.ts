// server.js - メインサーバーファイル
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// 環境変数の設定（本番環境では.envファイルなどで管理）
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; 
// 実際のデプロイ時には必ず安全な方法でシークレットキーを管理してください

// データベース初期化
const dbPath = path.join(__dirname, 'gameratings.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('SQLiteデータベースに接続しました');
    initializeDatabase();
  }
});

// データベースのテーブル初期化
function initializeDatabase() {
  // ユーザーテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rating INTEGER DEFAULT 1500,
      matches_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_match TIMESTAMP
    )
  `);

  // 対戦テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      winner_id INTEGER NOT NULL,
      player1_rating_before INTEGER NOT NULL,
      player1_rating_after INTEGER NOT NULL,
      player2_rating_before INTEGER NOT NULL,
      player2_rating_after INTEGER NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player1_id) REFERENCES users (id),
      FOREIGN KEY (player2_id) REFERENCES users (id),
      FOREIGN KEY (winner_id) REFERENCES users (id)
    )
  `);
}

// Expressアプリケーション設定
const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '認証が必要です' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'トークンが無効です' });
    }
    req.user = user;
    next();
  });
};

// ユーザー登録API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'ユーザー名とパスワードは必須です' });
  }
  
  try {
    // 既存ユーザーのチェック
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (user) {
        return res.status(400).json({ message: 'そのユーザー名は既に使用されています' });
      }
      
      // パスワードのハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // ユーザーの作成
      db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'ユーザー登録に失敗しました' });
          }
          
          // JWTトークンの生成
          const token = jwt.sign(
            { id: this.lastID, username },
            JWT_SECRET,
            { expiresIn: '7d' }
          );
          
          res.status(201).json({ 
            message: 'ユーザー登録が完了しました',
            token,
            user: { id: this.lastID, username }
          });
        }
      );
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ログインAPI
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'ユーザー名とパスワードは必須です' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'ユーザー名またはパスワードが正しくありません' });
    }
    
    try {
      // パスワードの検証
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ message: 'ユーザー名またはパスワードが正しくありません' });
      }
      
      // JWTトークンの生成
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        message: 'ログインに成功しました',
        token,
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      console.error('ログインエラー:', error);
      res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
  });
});

// 現在のユーザー情報を取得するAPI
app.get('/api/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, rating, matches_played, wins FROM users WHERE id = ?', 
    [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }
      
      res.json({ user });
    });
});

// 全プレイヤー一覧を取得するAPI
app.get('/api/players', (req, res) => {
  db.all(`
    SELECT id, username, rating, matches_played, wins, last_match
    FROM users
    ORDER BY rating DESC
  `, [], (err, players) => {
    if (err) {
      return res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
    
    res.json({ players });
  });
});

// ランキングを取得するAPI
app.get('/api/players/ranking', (req, res) => {
  db.all(`
    SELECT id, username, rating, matches_played, wins
    FROM users
    WHERE matches_played > 0
    ORDER BY rating DESC
    LIMIT 100
  `, [], (err, players) => {
    if (err) {
      return res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
    
    res.json({ players });
  });
});

// 対戦記録を取得するAPI
app.get('/api/matches', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      m.id, 
      m.player1_id, 
      m.player2_id, 
      m.winner_id, 
      m.player1_rating_before, 
      m.player1_rating_after, 
      m.player2_rating_before, 
      m.player2_rating_after, 
      m.timestamp,
      u1.username as player1_username,
      u2.username as player2_username,
      u3.username as winner_username
    FROM matches m
    JOIN users u1 ON m.player1_id = u1.id
    JOIN users u2 ON m.player2_id = u2.id
    JOIN users u3 ON m.winner_id = u3.id
    ORDER BY m.timestamp DESC
    LIMIT 50
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
    
    // データを整形
    const matches = rows.map(row => ({
      id: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      winnerId: row.winner_id,
      player1RatingBefore: row.player1_rating_before,
      player1RatingAfter: row.player1_rating_after,
      player2RatingBefore: row.player2_rating_before,
      player2RatingAfter: row.player2_rating_after,
      timestamp: row.timestamp,
      player1: { id: row.player1_id, username: row.player1_username },
      player2: { id: row.player2_id, username: row.player2_username },
      winner: { id: row.winner_id, username: row.winner_username }
    }));
    
    res.json({ matches });
  });
});

// 対戦を記録するAPI（Eloレーティングシステムによるレーティング計算）
app.post('/api/matches', authenticateToken, (req, res) => {
  const { player1Id, player2Id, winnerId } = req.body;
  
  // パラメーターの検証
  if (!player1Id || !player2Id || !winnerId) {
    return res.status(400).json({ message: '必須パラメーターが不足しています' });
  }
  
  if (player1Id === player2Id) {
    return res.status(400).json({ message: '同じプレイヤー同士の対戦はできません' });
  }
  
  if (winnerId !== player1Id && winnerId !== player2Id) {
    return res.status(400).json({ message: '勝者は対戦プレイヤーの中から選択してください' });
  }
  
  // トランザクション開始
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // プレイヤー情報の取得
    db.get(
      'SELECT id, rating FROM users WHERE id = ?',
      [player1Id],
      (err, player1) => {
        if (err || !player1) {
          db.run('ROLLBACK');
          return res.status(404).json({ message: 'プレイヤー1が見つかりません' });
        }
        
        db.get(
          'SELECT id, rating FROM users WHERE id = ?',
          [player2Id],
          (err, player2) => {
            if (err || !player2) {
              db.run('ROLLBACK');
              return res.status(404).json({ message: 'プレイヤー2が見つかりません' });
            }
            
            // Eloレーティング計算（K=32を使用）
            const K = 32;
            const player1Rating = player1.rating;
            const player2Rating = player2.rating;
            
            // 期待勝率の計算
            const expectedScore1 = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
            const expectedScore2 = 1 / (1 + Math.pow(10, (player1Rating - player2Rating) / 400));
            
            // 実際のスコア（1=勝ち、0=負け）
            const actualScore1 = winnerId === player1Id ? 1 : 0;
            const actualScore2 = winnerId === player2Id ? 1 : 0;
            
            // 新しいレーティングの計算
            const newRating1 = Math.round(player1Rating + K * (actualScore1 - expectedScore1));
            const newRating2 = Math.round(player2Rating + K * (actualScore2 - expectedScore2));
            
            // 対戦記録の保存
            db.run(
              `INSERT INTO matches 
               (player1_id, player2_id, winner_id, 
                player1_rating_before, player1_rating_after, 
                player2_rating_before, player2_rating_after) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                player1Id, player2Id, winnerId,
                player1Rating, newRating1,
                player2Rating, newRating2
              ],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('対戦記録エラー:', err);
                  return res.status(500).json({ message: '対戦の記録に失敗しました' });
                }
                
                const matchId = this.lastID;
                
                // プレイヤー1のレーティング更新
                db.run(
                  `UPDATE users 
                   SET rating = ?, 
                       matches_played = matches_played + 1,
                       wins = CASE WHEN ? = id THEN wins + 1 ELSE wins END,
                       last_match = CURRENT_TIMESTAMP
                   WHERE id = ?`,
                  [newRating1, winnerId, player1Id],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('プレイヤー1更新エラー:', err);
                      return res.status(500).json({ message: 'レーティングの更新に失敗しました' });
                    }
                    
                    // プレイヤー2のレーティング更新
                    db.run(
                      `UPDATE users 
                       SET rating = ?, 
                           matches_played = matches_played + 1,
                           wins = CASE WHEN ? = id THEN wins + 1 ELSE wins END,
                           last_match = CURRENT_TIMESTAMP
                       WHERE id = ?`,
                      [newRating2, winnerId, player2Id],
                      (err) => {
                        if (err) {
                          db.run('ROLLBACK');
                          console.error('プレイヤー2更新エラー:', err);
                          return res.status(500).json({ message: 'レーティングの更新に失敗しました' });
                        }
                        
                        // トランザクションのコミット
                        db.run('COMMIT');
                        
                        // 更新された対戦情報を取得して返す
                        db.get(`
                          SELECT 
                            m.id, 
                            m.player1_id, 
                            m.player2_id, 
                            m.winner_id, 
                            m.player1_rating_before, 
                            m.player1_rating_after, 
                            m.player2_rating_before, 
                            m.player2_rating_after, 
                            m.timestamp,
                            u1.username as player1_username,
                            u2.username as player2_username,
                            u3.username as winner_username
                          FROM matches m
                          JOIN users u1 ON m.player1_id = u1.id
                          JOIN users u2 ON m.player2_id = u2.id
                          JOIN users u3 ON m.winner_id = u3.id
                          WHERE m.id = ?
                        `, [matchId], (err, row) => {
                          if (err) {
                            console.error('対戦取得エラー:', err);
                            return res.status(500).json({ message: '対戦情報の取得に失敗しました' });
                          }
                          
                          const match = {
                            id: row.id,
                            player1Id: row.player1_id,
                            player2Id: row.player2_id,
                            winnerId: row.winner_id,
                            player1RatingBefore: row.player1_rating_before,
                            player1RatingAfter: row.player1_rating_after,
                            player2RatingBefore: row.player2_rating_before,
                            player2RatingAfter: row.player2_rating_after,
                            timestamp: row.timestamp,
                            player1: { id: row.player1_id, username: row.player1_username },
                            player2: { id: row.player2_id, username: row.player2_username },
                            winner: { id: row.winner_id, username: row.winner_username }
                          };
                          
                          res.status(201).json({
                            message: '対戦を記録しました',
                            match
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

// プロセス終了時にデータベース接続を閉じる
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('データベースクローズエラー:', err.message);
    } else {
      console.log('データベース接続を閉じました');
    }
    process.exit(0);
  });
});