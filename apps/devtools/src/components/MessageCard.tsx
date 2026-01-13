import React from 'react';
import type { Message } from '../services/api';
import { Clock, MapPin, Rocket, User } from 'lucide-react';

interface MessageCardProps {
  message: Message;
  onBoost: (message: Message) => void;
  isProcessing?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onBoost,
  isProcessing = false,
}) => {
  const isExpired = message.timeLeft <= 0;

  return (
    <div className={`p-4 rounded-xl mb-4 border transition-all ${message.isOwner
      ? 'bg-blue-500/10 border-blue-500/30'
      : 'bg-zinc-800 border-zinc-700'
      }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {isExpired ? 'Expired' : `${message.timeLeft}m left`}
          </span>
          <span className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            {message.activeDistance.toFixed(1)} km
          </span>
        </div>
        {message.isOwner && (
          <span className="flex items-center px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium border border-blue-500/30">
            <User className="w-3 h-3 mr-1" />
            YOU
          </span>
        )}
      </div>

      <p className="text-zinc-100 text-base mb-4 leading-relaxed font-medium">
        {message.text}
      </p>

      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        <button
          onClick={() => onBoost(message)}
          disabled={isProcessing || isExpired}
          className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${message.isBoosted
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            } ${isProcessing || isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Rocket className={`w-4 h-4 mr-1.5 ${message.isBoosted ? 'fill-current' : ''}`} />
          <span>{message.boostCount}</span>
        </button>
      </div>
    </div>
  );
};
