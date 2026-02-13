import React from 'react';
import { Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

const WalletButton: React.FC = () => {
  const { address, connect, isConnecting } = useWallet();

  if (address) {
    // Return null to make the button invisible when connected
    return null;
  }

  return (
    <button 
      onClick={connect}
      disabled={isConnecting}
      className="flex items-center gap-2 bg-[#0052FF] hover:bg-[#0040CC] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <Wallet size={16} />
      {isConnecting ? 'Connecting...' : 'Connect'}
    </button>
  );
};

export default WalletButton;