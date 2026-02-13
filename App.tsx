import React, { useState, useCallback, useEffect, useRef } from 'react';
import MintSection from './components/MintSection';
import StatsOverview from './components/StatsOverview';
import CanvasList from './components/CanvasList';
import FeaturedCanvases from './components/FeaturedCanvases';
import Toast from './components/Toast';
import { ShieldAlert, LayoutDashboard } from 'lucide-react';
import { useWallet } from './hooks/useWallet';

const App: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [isSyncingWallet, setIsSyncingWallet] = useState(false);

  const { address, connect, error: walletError } = useWallet();
  const didAutoConnect = useRef(false);
  const mintSectionRef = useRef<{ openSuccess: () => void } | null>(null);

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove('dark');
  }, []);

  // Wallet auto-sync with delay to avoid race condition with SDK injection in Farcaster
  useEffect(() => {
    const syncWallet = async () => {
      if (!didAutoConnect.current && !address) {
        didAutoConnect.current = true;
        setIsSyncingWallet(true);
        // Wait 1.2s to ensure the provider is ready in the Farcaster environment
        await new Promise(resolve => setTimeout(resolve, 1200));
        try {
          await connect();
        } catch (e) {
          console.error("Auto-sync failed", e);
        } finally {
          setIsSyncingWallet(false);
        }
      }
    };
    syncWallet();
  }, [connect, address]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ msg, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-200 text-gray-900 transition-colors">
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="max-w-md mx-auto px-4 py-6 w-full flex flex-col flex-1 overflow-hidden">
          {walletError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-500 text-sm flex-shrink-0">
              <ShieldAlert size={18} />
              <span>{walletError}</span>
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 overflow-y-auto no-scrollbar">
            {/* 1. Mint Section at the Top */}
            <div className="pt-2 pb-0">
              <MintSection ref={mintSectionRef} onShowToast={showToast} />
            </div>

            {/* 2. Portfolio Stats + Canvas List */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4 ml-1">
                <LayoutDashboard className="text-gray-400" size={22} />
                <h2 className="text-xl font-bold text-gray-900">Your Portfolio</h2>
              </div>

              {/* CanvasList now manages its own data loading from OpenSea */}
              <div className="py-2">
                <CanvasList onShowToast={showToast} />
              </div>
            </div>

            {/* 3. Secondary Market Section - Featured Canvases */}
            <div className="mt-8">
              <FeaturedCanvases onShowToast={showToast} />
            </div>

            <div className="mt-8 pb-12 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                Basepaint tracker by pinkyblu.eth
              </p>
            </div>
          </div>
        </div>
      </main>

      {toastMessage && (
        <Toast
          message={toastMessage.msg}
          type={toastMessage.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
};

export default App;
