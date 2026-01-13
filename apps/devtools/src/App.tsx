import { useState, useEffect } from 'react';
import { CreateMessage } from './components/CreateMessage';
import { Feed } from './components/Feed';
import { getOrGenerateUserId, refreshUserId } from './utils/identity';
import { User, RefreshCw, Terminal } from 'lucide-react';

function App() {
  const [userId, setUserId] = useState('');
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    setUserId(getOrGenerateUserId());
  }, []);

  const handleRefreshIdentity = () => {
    if (confirm('Are you sure? This will reset your identity for posting.')) {
      const newId = refreshUserId();
      setUserId(newId);
    }
  };

  const handlePostSuccess = () => {
    // Trigger feed refresh
    setFeedKey((p) => p + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CROWD DevTools</h1>
            <p className="text-xs text-zinc-500 font-medium">Debug & Simulation Console</p>
          </div>
        </div>

        <div className="flex items-center bg-black/40 rounded-xl p-1.5 pl-4 border border-zinc-800">
          <div className="flex items-center mr-4">
            <User className="w-4 h-4 text-zinc-500 mr-2" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Current Identity</span>
              <span className="text-xs font-mono text-zinc-300 max-w-[100px] truncate md:max-w-none">{userId}</span>
            </div>
          </div>
          <button
            onClick={handleRefreshIdentity}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Refresh Identity"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        {/* Left Panel: Create */}
        <div className="lg:col-span-5 h-full">
          <CreateMessage onSuccess={handlePostSuccess} />
        </div>

        {/* Right Panel: Feed */}
        <div className="lg:col-span-7 h-full">
          <Feed key={feedKey} />
        </div>
      </main>
    </div>
  );
}

export default App;
