import { useState, useCallback, useEffect } from 'react';
import { getCrowds, createCrowd, joinCrowd, leaveCrowd, type Crowd } from '../services/api';
import { Users, Plus, LogOut, Copy, RefreshCw } from 'lucide-react';

export function Crowds() {
  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newCrowdName, setNewCrowdName] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // Join form
  const [joinCrowdId, setJoinCrowdId] = useState('');

  const loadCrowds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCrowds();
      setCrowds(data);
    } catch (error) {
      console.error('Failed to load crowds', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCrowds();
  }, [loadCrowds]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrowdName.trim()) return;

    try {
      setCreating(true);
      await createCrowd(newCrowdName, isOpen);
      setNewCrowdName('');
      loadCrowds();
    } catch (error) {
      console.error('Failed to create crowd', error);
      alert('Failed to create crowd');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCrowdId.trim()) return;

    try {
      await joinCrowd(joinCrowdId);
      setJoinCrowdId('');
      loadCrowds();
    } catch (error) {
      console.error('Failed to join crowd', error);
      alert('Failed to join crowd. Might be closed or you are already a member.');
    }
  };

  const handleLeave = async (crowdId: string) => {
    if (!confirm('Are you sure you want to leave this crowd?')) return;
    try {
      await leaveCrowd(crowdId);
      loadCrowds();
    } catch (error) {
      console.error('Failed to leave crowd', error);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      alert('Crowd ID copied!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-500" />
          My Crowds
        </h2>
        <button
          onClick={loadCrowds}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Crowd */}
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 backdrop-blur-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" /> Create New Crowd
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Crowd Name</label>
              <input
                type="text"
                value={newCrowdName}
                onChange={(e) => setNewCrowdName(e.target.value)}
                placeholder="e.g. Portland Hikers"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={creating}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isOpen"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 rounded focus:ring-blue-500"
                disabled={creating}
              />
              <label htmlFor="isOpen" className="text-sm text-zinc-400">Open Crowd (anyone can join)</label>
            </div>
            <button
              type="submit"
              disabled={creating || !newCrowdName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {creating ? 'Creating...' : 'Create Crowd'}
            </button>
          </form>
        </div>

        {/* Join Crowd */}
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 backdrop-blur-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" /> Join Existing
          </h3>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Crowd ID</label>
              <input
                type="text"
                value={joinCrowdId}
                onChange={(e) => setJoinCrowdId(e.target.value)}
                placeholder="UUID"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!joinCrowdId.trim()}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600"
            >
              Join Crowd
            </button>
          </form>
        </div>
      </div>

      {/* Crowds List */}
      <div className="flex-1 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 backdrop-blur-xl overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Your Active Crowds</h3>
          <button
            onClick={loadCrowds}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {crowds.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            You haven't joined any crowds yet.
          </div>
        ) : (
          <div className="space-y-3">
            {crowds.map((crowd) => (
              <div key={crowd.id} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-between hover:border-zinc-700 transition-colors">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-zinc-200">{crowd.name}</h4>
                    {crowd.isOwner && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">OWNER</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${crowd.isOpen ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {crowd.isOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-500 mt-1 flex items-center space-x-4">
                    <span>{crowd.memberCount} members</span>
                    <span>Expires: {new Date(crowd.expiresAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopyId(crowd.id)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Copy Crowd ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleLeave(crowd.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Leave Crowd"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
