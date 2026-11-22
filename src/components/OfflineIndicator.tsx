import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-[#1e1408]/95 px-3.5 py-2 text-xs font-semibold text-amber-200 backdrop-blur-md shadow-lg">
      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
      <span>Offline Mode — Playing from cached game files</span>
    </div>
  );
};
