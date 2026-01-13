import React, { useState } from 'react';
import { createMessage } from '../services/api';
import type { CreateMessagePayload } from '../services/api';

import { useLocation } from '../hooks/useLocation';
import { Send, MapPin, Clock, Edit2, RotateCcw } from 'lucide-react';

interface CreateMessageProps {
  onSuccess: () => void;
}

export const CreateMessage: React.FC<CreateMessageProps> = ({ onSuccess }) => {
  const { location } = useLocation();
  const [text, setText] = useState('');
  const [duration, setDuration] = useState(60);
  const [distance, setDistance] = useState(2500); // meters

  // Manual location state
  const [manualLat, setManualLat] = useState<string>('37.7749');
  const [manualLng, setManualLng] = useState<string>('-122.4194');
  const [useManual, setUseManual] = useState(false);

  // Sync with device location initially or when requested
  React.useEffect(() => {
    if (location && !useManual) {
      setManualLat(location.latitude.toFixed(6));
      setManualLng(location.longitude.toFixed(6));
    }
  }, [location, useManual]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!location) {
      setError('Location not available');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);

      if (isNaN(lat) || isNaN(lng)) {
        setError('Invalid coordinates');
        return;
      }

      const payload: CreateMessagePayload = {
        text: text.trim(),
        duration,
        distance,
      };

      await createMessage(payload, {
        latitude: lat,
        longitude: lng,
      });

      setText('');
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Failed to post message');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log(location)

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-6 text-zinc-100">
        <Edit2 className="w-5 h-5 text-blue-500" />
        <h2 className="text-xl font-bold">Create Post</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-col flex flex-1 space-y-6">
        {/* Message Input */}
        <div className="mb-6 flex-1 pb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Message
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            className="w-full h-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-medium leading-relaxed"
            placeholder="What's happening nearby?"
          />
          <div className="text-right text-xs text-zinc-500">
            {text.length}/120
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Duration Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="flex items-center text-sm font-medium text-zinc-400">
                <Clock className="w-4 h-4 mr-2" />
                Active Duration
              </label>
              <span className="text-sm font-bold text-blue-400">{Math.round(duration)} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="720"
              step="5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Radius Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="flex items-center text-sm font-medium text-zinc-400">
                <MapPin className="w-4 h-4 mr-2" />
                Visible Radius
              </label>
              <span className="text-sm font-bold text-emerald-400">{(distance / 1000).toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="100"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Manual Location Input */}
          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
            <div className="flex justify-between mb-3">
              <label className="flex items-center text-sm font-medium text-zinc-400">
                <MapPin className="w-4 h-4 mr-2" />
                Posting Location
              </label>
              <button
                type="button"
                onClick={() => setUseManual(false)}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Sync Device
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Latitude</label>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setUseManual(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="37.7749"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Longitude</label>
                <input
                  type="text"
                  value={manualLng}
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setUseManual(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="-122.4194"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !location}
          className={`mt-6 w-full py-4 rounded-xl flex items-center justify-center font-bold text-white transition-all ${isSubmitting || !location
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
        >
          {isSubmitting ? (
            'Posting...'
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Post Message
            </>
          )}
        </button>

        {error && (
          <p className="text-red-400 text-sm mt-3 text-center bg-red-500/10 py-2 rounded-lg">{error}</p>
        )}
      </form>
    </div>
  );
};
