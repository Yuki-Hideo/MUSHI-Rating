import { useState, useEffect } from 'react';
import { XCircle, Trophy, Shield, LogIn, UserPlus, LogOut, Home, List, Users, Award } from 'lucide-react';

// 認証関連の状態管理
const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // トークンからユーザー情報を取得
      fetch('https://your-tunnel-url.com/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(err => {
        console.error('認証エラー:', err);
        logout();
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch('https://your-tunnel-url.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'ログインに失敗しました' };
      }
    } catch (err) {
      return { success: false, message: 'サーバーエラーが発生しました' };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await fetch('https://your-tunnel-url.com/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message || '登録に失敗しました' };
      }
    } catch (err) {
      return { success: false, message: 'サーバーエラーが発生しました' };
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUser(null);
  };

  return { token, user, login, register, logout, isAuthenticated: !!token };
};

// メインアプリ
export default function App() {
  const [activePage, setActivePage] = useState('home');
  const { user, isAuthenticated, login, register, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Trophy className="mr-2" /> ゲームレーティングシステム
          </h1>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span>こんにちは、{user?.username || 'ユーザー'}さん</span>
                <button 
                  onClick={logout}
                  className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded flex items-center"
                >
                  <LogOut size={18} className="mr-1" /> ログアウト
                </button>
              </div>
            ) : (
              <div className="space-x-2">
                <button 
                  onClick={() => setActivePage('login')}
                  className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded flex items-center inline-flex"
                >
                  <LogIn size={18} className="mr-1" /> ログイン
                </button>
                <button 
                  onClick={() => setActivePage('register')}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center inline-flex"
                >
                  <UserPlus size={18} className="mr-1" /> 登録
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto py-6 px-6 flex">
        {/* サイドナビゲーション */}
        <nav className="w-64 pr-6">
          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <NavItem 
              icon={<Home size={18} />}
              title="ホーム"
              active={activePage === 'home'}
              onClick={() => setActivePage('home')}
            />
            <NavItem 
              icon={<Trophy size={18} />}
              title="対戦記録"
              active={activePage === 'matches'}
              onClick={() => setActivePage('matches')}
              disabled={!isAuthenticated}
            />
            <NavItem 
              icon={<Award size={18} />}
              title="ランキング"
              active={activePage === 'ranking'}
              onClick={() => setActivePage('ranking')}
            />
            <NavItem 
              icon={<Users size={18} />}
              title="プレイヤー一覧"
              active={activePage === 'players'}
              onClick={() => setActivePage('players')}
            />
          </div>
        </nav>
        
        {/* メインコンテンツ */}
        <div className="flex-grow">
          {activePage === 'home' && <HomePage />}
          {activePage === 'login' && <LoginPage onLogin={login} switchToRegister={() => setActivePage('register')} />}
          {activePage === 'register' && <RegisterPage onRegister={register} switchToLogin={() => setActivePage('login')} />}
          {activePage === 'matches' && <MatchesPage />}
          {activePage === 'ranking' && <RankingPage />}
          {activePage === 'players' && <PlayersPage />}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-6 text-center">
          <p>© 2025 ゲームレーティングシステム</p>
        </div>
      </footer>
    </div>
  );
}

// ナビゲーションアイテムコンポーネント
function NavItem({ icon, title, active, onClick, disabled = false }) {
  return (
    <button
      className={`w-full text-left px-4 py-2 rounded flex items-center ${
        active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? null : onClick}
      disabled={disabled}
    >
      <span className="mr-3">{icon}</span>
      {title}
    </button>
  );
}

// ホームページ
function HomePage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Home className="mr-2" /> ようこそ
      </h2>
      <div className="space-y-4">
        <p>
          このシステムでは、対戦ゲームの結果を記録し、プレイヤーのレーティングを自動的に計算します。
          レーティングはEloシステムに基づいており、勝敗によってポイントが増減します。
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <h3 className="font-bold text-lg mb-2">使い方</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>アカウントを登録してログインします</li>
            <li>対戦結果を登録することでレーティングが更新されます</li>
            <li>ランキングページで全プレイヤーのレーティングを確認できます</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ログインページ
function LoginPage({ onLogin, switchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await onLogin(username, password);
    setLoading(false);
    
    if (!result.success) {
      setError(result.message);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <LogIn className="mr-2" /> ログイン
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-center">
          <XCircle className="mr-2" size={20} />
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p>
          アカウントをお持ちでない場合は
          <button
            onClick={switchToRegister}
            className="text-blue-600 hover:underline ml-1"
          >
            登録してください
          </button>
        </p>
      </div>
    </div>
  );
}

// 登録ページ
function RegisterPage({ onRegister, switchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    
    setLoading(true);
    const result = await onRegister(username, password);
    setLoading(false);
    
    if (!result.success) {
      setError(result.message);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <UserPlus className="mr-2" /> アカウント登録
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-center">
          <XCircle className="mr-2" size={20} />
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={3}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">パスワード（確認）</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? '登録中...' : 'アカウント登録'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p>
          すでにアカウントをお持ちの場合は
          <button
            onClick={switchToLogin}
            className="text-blue-600 hover:underline ml-1"
          >
            ログインしてください
          </button>
        </p>
      </div>
    </div>
  );
}

// 対戦記録ページ
function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 新規対戦用のステート
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [winner, setWinner] = useState('');
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    Promise.all([
      fetch('https://your-tunnel-url.com/api/matches', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('https://your-tunnel-url.com/api/players', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([matchesData, playersData]) => {
      setMatches(matchesData.matches || []);
      setPlayers(playersData.players || []);
      setLoading(false);
    })
    .catch(err => {
      console.error('データ取得エラー:', err);
      setError('データの取得中にエラーが発生しました');
      setLoading(false);
    });
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('https://your-tunnel-url.com/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          player1Id: player1,
          player2Id: player2,
          winnerId: winner
        })
      });
      
      const data = await res.json();
      if (data.match) {
        // 新しい対戦を追加
        setMatches([data.match, ...matches]);
        // フォームをリセット
        setPlayer1('');
        setPlayer2('');
        setWinner('');
      } else {
        setError(data.message || '対戦の記録に失敗しました');
      }
    } catch (err) {
      setError('サーバーエラーが発生しました');
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Trophy className="mr-2" /> 対戦記録
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-center">
          <XCircle className="mr-2" size={20} />
          {error}
        </div>
      )}
      
      {/* 対戦記録フォーム */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-bold text-lg mb-3">新規対戦を記録</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">プレイヤー1</label>
              <select
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                required
              >
                <option value="">選択してください</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.username} ({player.rating})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">プレイヤー2</label>
              <select
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                required
                disabled={!player1}
              >
                <option value="">選択してください</option>
                {players
                  .filter(p => p.id !== player1)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.username} ({player.rating})
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">勝者</label>
              <select
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                required
                disabled={!player1 || !player2}
              >
                <option value="">選択してください</option>
                {player1 && <option value={player1}>
                  {players.find(p => p.id === player1)?.username || 'プレイヤー1'}
                </option>}
                {player2 && <option value={player2}>
                  {players.find(p => p.id === player2)?.username || 'プレイヤー2'}
                </option>}
              </select>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              disabled={!player1 || !player2 || !winner}
            >
              対戦を記録
            </button>
          </div>
        </form>
      </div>
      
      {/* 対戦履歴テーブル */}
      <div>
        <h3 className="font-bold text-lg mb-3">対戦履歴</h3>
        
        {loading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-4 text-gray-500">対戦記録がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border text-left">日時</th>
                  <th className="py-2 px-4 border text-left">プレイヤー1</th>
                  <th className="py-2 px-4 border text-left">プレイヤー2</th>
                  <th className="py-2 px-4 border text-left">勝者</th>
                  <th className="py-2 px-4 border text-left">レーティング変動</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(match => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border">
                      {new Date(match.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 border">
                      {match.player1.username} ({match.player1RatingBefore})
                    </td>
                    <td className="py-2 px-4 border">
                      {match.player2.username} ({match.player2RatingBefore})
                    </td>
                    <td className="py-2 px-4 border font-medium">
                      {match.winner.username}
                    </td>
                    <td className="py-2 px-4 border">
                      <div className="flex flex-col">
                        <span className={match.player1Id === match.winnerId ? 'text-green-600' : 'text-red-600'}>
                          {match.player1.username}: {match.player1RatingBefore} → {match.player1RatingAfter}
                          {' '}
                          ({match.player1Id === match.winnerId ? '+' : ''}{match.player1RatingAfter - match.player1RatingBefore})
                        </span>
                        <span className={match.player2Id === match.winnerId ? 'text-green-600' : 'text-red-600'}>
                          {match.player2.username}: {match.player2RatingBefore} → {match.player2RatingAfter}
                          {' '}
                          ({match.player2Id === match.winnerId ? '+' : ''}{match.player2RatingAfter - match.player2RatingBefore})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ランキングページ
function RankingPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetch('https://your-tunnel-url.com/api/players/ranking')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('ランキング取得エラー:', err);
        setError('ランキングの取得中にエラーが発生しました');
        setLoading(false);
      });
  }, []);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Award className="mr-2" /> ランキング
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-4">読み込み中...</div>
      ) : players.length === 0 ? (
        <div className="text-center py-4 text-gray-500">プレイヤーデータがありません</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border text-left">順位</th>
                <th className="py-2 px-4 border text-left">プレイヤー</th>
                <th className="py-2 px-4 border text-left">レーティング</th>
                <th className="py-2 px-4 border text-left">対戦数</th>
                <th className="py-2 px-4 border text-left">勝率</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr key={player.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                  <td className="py-2 px-4 border font-bold">
                    {index === 0 && <Trophy className="inline text-yellow-500 mr-1" size={18} />}
                    {index + 1}
                  </td>
                  <td className="py-2 px-4 border font-medium">{player.username}</td>
                  <td className="py-2 px-4 border">{player.rating}</td>
                  <td className="py-2 px-4 border">{player.matchesPlayed}</td>
                  <td className="py-2 px-4 border">
                    {player.matchesPlayed > 0
                      ? `${((player.wins / player.matchesPlayed) * 100).toFixed(1)}% (${player.wins}/${player.matchesPlayed})`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// プレイヤー一覧ページ
function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetch('https://your-tunnel-url.com/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('プレイヤー取得エラー:', err);
        setError('プレイヤー情報の取得中にエラーが発生しました');
        setLoading(false);
      });
  }, []);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Users className="mr-2" /> プレイヤー一覧
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-4">読み込み中...</div>
      ) : players.length === 0 ? (
        <div className="text-center py-4 text-gray-500">プレイヤーデータがありません</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(player => (
            <div key={player.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{player.username}</h3>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  {player.rating} ポイント
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>対戦数:</span>
                  <span className="font-medium">{player.matchesPlayed || 0} 試合</span>
                </div>
                <div className="flex justify-between">
                  <span>勝利数:</span>
                  <span className="font-medium">{player.wins || 0} 勝</span>
                </div>
                <div className="flex justify-between">
                  <span>勝率:</span>
                  <span className="font-medium">
                    {player.matchesPlayed > 0 
                      ? `${((player.wins / player.matchesPlayed) * 100).toFixed(1)}%` 
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>最終対戦:</span>
                  <span className="font-medium">
                    {player.lastMatch ? new Date(player.lastMatch).toLocaleDateString() : '未対戦'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}