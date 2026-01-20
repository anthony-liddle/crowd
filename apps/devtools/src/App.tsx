import { useState, useEffect, Component, ReactNode } from 'react';
import { CreateMessage } from './components/CreateMessage';
import { Feed } from './components/Feed';
import { Crowds } from './components/Crowds';
import { getOrGenerateUserId, refreshUserId } from './utils/identity';
import { User, RefreshCw, Terminal, MessageSquare, Users, AlertTriangle } from 'lucide-react';

type Tab = 'messages' | 'crowds';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-zinc-400 text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [userId, setUserId] = useState('');
  const [feedKey, setFeedKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('messages');

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
      <header className="max-w-7xl mx-auto mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CROWD DevTools</h1>
              <p className="text-xs text-zinc-500 font-medium">Debug & Simulation Console</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-800/50">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'messages'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('crowds')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'crowds'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Crowds
            </button>
          </div>

          <div className="flex items-center bg-black/40 rounded-xl p-1.5 pl-4 border border-zinc-800 w-full md:w-auto justify-between md:justify-start">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto h-[calc(100vh-140px)]">
        {activeTab === 'messages' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left Panel: Create */}
            <div className="lg:col-span-5 h-full">
              <CreateMessage onSuccess={handlePostSuccess} />
            </div>

            {/* Right Panel: Feed */}
            <div className="lg:col-span-7 h-full">
              <Feed key={feedKey} />
            </div>
          </div>
        ) : (
          <div className="h-full">
            <Crowds />
          </div>
        )}
      </main>
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;

