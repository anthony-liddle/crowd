import React, { useEffect, useState, useCallback } from 'react';
import { getMessages, boostMessage, getCrowds } from '../services/api';
import type { Message, Crowd } from '../services/api';
import { useLocation } from '../hooks/useLocation';
import { MessageCard } from './MessageCard';
import { Loader2, RefreshCw, MapPin, RotateCcw, Users } from 'lucide-react';

export const Feed: React.FC = () => {
  const { location, loading: locationLoading } = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [crowds, setCrowds] = useState<Crowd[]>([]);
  const [selectedCrowdId, setSelectedCrowdId] = useState<string>('');

  // Manual location state (default to SF if no location)
  const [manualLat, setManualLat] = useState<string>('45.5152');
  const [manualLng, setManualLng] = useState<string>('-122.6784');
  const [useManual, setUseManual] = useState(false);

  // Sync with device location initially or when requested
  useEffect(() => {
    if (location && !useManual) {
      setManualLat(location.latitude.toFixed(6));
      setManualLng(location.longitude.toFixed(6));
    }
  }, [location, useManual]);

  // Load crowds
  useEffect(() => {
    const loadCrowds = async () => {
      try {
        const data = await getCrowds();
        setCrowds(data);
      } catch (err) {
        console.error('Failed to load crowds', err);
      }
    };
    loadCrowds();
  }, []);

  const fetchMessages = useCallback(async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) return;

    setLoading(true);
    try {
      const data = await getMessages({
        latitude: lat,
        longitude: lng,
        crowdId: selectedCrowdId || null,
      });
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
    }
  }, [manualLat, manualLng, selectedCrowdId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Refresh every 30 seconds to show accurate countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      // Re-fetch to get fresh data
      fetchMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);


  const handleBoost = async (msg: Message) => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) return;

    setBoostingId(msg.id);
    try {
      await boostMessage(msg.id, {
        latitude: lat,
        longitude: lng,
      });
      await fetchMessages();
    } catch (error) {
      console.error(error);
    } finally {
      setBoostingId(null);
    }
  };

  if (locationLoading && !useManual && !manualLat) {
    return (
      <div className="flex justify-center items-center h-64 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Acquiring Location...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center">
            Live Feed
            <span className="ml-2 text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Crowd Filter */}
          <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
            <label className="text-xs font-medium text-zinc-500 flex items-center mb-2">
              <Users className="w-3 h-3 mr-1" />
              Filter by Crowd
            </label>
            <select
              value={selectedCrowdId}
              onChange={(e) => setSelectedCrowdId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 font-medium focus:border-blue-500/50 focus:outline-none transition-colors appearance-none"
            >
              <option value="">🌍 Everyone (Global)</option>
              {crowds.map((crowd) => (
                <option key={crowd.id} value={crowd.id}>
                  👥 {crowd.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Controls */}
          <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-500 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                Feed Location
              </label>
              <button
                onClick={() => setUseManual(false)}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                title="Reset to Device Location"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Sync Device
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setUseManual(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 font-mono focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="Latitude"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={manualLng}
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setUseManual(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 font-mono focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="Longitude"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-12 text-zinc-600">
            No active messages nearby{selectedCrowdId ? ' in this crowd' : ''}.
          </div>
        ) : (
          messages.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              onBoost={handleBoost}
              isProcessing={boostingId === msg.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
