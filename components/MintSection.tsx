import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Minus, Plus, Clock, Share, X, Loader2, PlusCircle, Paintbrush } from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_MINT, BASEPAINT_BRUSH_CONTRACT } from '../constants';
import { useWallet } from '../hooks/useWallet';
import sdk from '@farcaster/frame-sdk';

interface MintSectionProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

interface DailyData {
  day: number;
  title: string;
  mintsCount: number;
  timeLeft: string;
  price: number;
  imageUrl: string;
  mintingEndsAt?: number;
}

export interface MintSectionHandle {
  openSuccess: () => void;
}

const BP_GENESIS_TIMESTAMP = 1691593200;

const MintSection = forwardRef<MintSectionHandle, MintSectionProps>(({ onShowToast }, ref) => {
  const [mode, setMode] = useState<'current' | 'in-progress'>('current');
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [dailyData, setDailyData] = useState<DailyData>({
    day: CURRENT_MINT.day,
    title: "Loading...",
    mintsCount: 0,
    timeLeft: "--:--:--",
    price: 0.0026,
    imageUrl: CURRENT_MINT.imageUrl
  });
  
  const { address, connect } = useWallet();

  useImperativeHandle(ref, () => ({
    openSuccess: () => {
        setShowModal(true);
    }
  }));

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));

  const fetchDailyData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      let currentDay = 0;
      try {
        const brushAbi = ["function today() view returns (uint256)"];
        const brushContract = new ethers.Contract(BASEPAINT_BRUSH_CONTRACT, brushAbi, provider);
        const currentDayBigInt = await brushContract.today();
        currentDay = Number(currentDayBigInt) - 1;
      } catch (err) {
        const now = Math.floor(Date.now() / 1000);
        currentDay = Math.floor((now - BP_GENESIS_TIMESTAMP) / 86400);
      }

      if (currentDay < 1) currentDay = 1;

      // When in-progress, we look at the 'today' index (which is tomorrow's mint)
      const targetDay = mode === 'current' ? currentDay : currentDay + 1;
      const title = `BasePaint #${targetDay}`;
      const imageUrl = `https://basepaint.xyz/api/art/image?day=${targetDay}`;
      
      const nowMs = Date.now();
      const targetDate = new Date(nowMs);
      targetDate.setUTCHours(16, 40, 0, 0);
      if (targetDate.getTime() <= nowMs) {
          targetDate.setUTCDate(targetDate.getUTCDate() + 1);
      }
      const mintingEndsAt = Math.floor(targetDate.getTime() / 1000);

      setDailyData(prev => ({
        ...prev,
        day: targetDay,
        title: title,
        imageUrl: imageUrl,
        mintingEndsAt: mintingEndsAt,
      }));

    } catch (error) {
      console.error("Failed to fetch daily stats:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [mode]);

  useEffect(() => {
    setIsLoadingData(true);
    fetchDailyData();
    const interval = setInterval(fetchDailyData, 60000);
    return () => clearInterval(interval);
  }, [fetchDailyData]);

  useEffect(() => {
    if (!dailyData.mintingEndsAt) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = dailyData.mintingEndsAt! - now;
      if (diff <= 0) {
        setDailyData(prev => ({ ...prev, timeLeft: "00:00:00" }));
        fetchDailyData(); 
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        const fmt = (n: number) => n.toString().padStart(2, '0');
        setDailyData(prev => ({ ...prev, timeLeft: `${fmt(h)}:${fmt(m)}:${fmt(s)}` }));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dailyData.mintingEndsAt, fetchDailyData]);

  const handleMint = async () => {
    if (!address) {
      await connect();
      return;
    }

    setIsMinting(true);
    // Mock minting delay
    setTimeout(() => {
      setIsMinting(false);
      setShowModal(true);
      const actionLabel = mode === 'current' ? 'minted' : 'pre-ordered';
      onShowToast(`Successfully ${actionLabel} ${quantity}x (Mock)`, 'success');
    }, 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setQuantity(1);
  };

  const handleShare = async () => {
    try {
      const referralLink = `https://basepaint.xyz/mint/${dailyData.day}?referrer=0x5c67C59c850afB2fB2aaCe4C3E03A222b992266C`;
      const actionText = mode === 'current' ? 'minted canvas' : 'pre-ordered the upcoming canvas';
      const message = `I just ${actionText} #${dailyData.day} on Basepaint! Hundreds of pixel artists created this onchain art in 24 hours and are creating another one right now, check it out ${referralLink}`;
      await sdk.actions.composeCast({
        text: message,
        embeds: [referralLink]
      });
    } catch (error) {
      console.error("Error creating compose cast", error);
    }
  };

  const totalPrice = (dailyData.price * quantity).toFixed(4);

  return (
    <>
      <div className="mb-2">
        <div className="flex flex-col gap-3 mb-4 ml-1">
            <div className="flex items-center gap-2">
                <PlusCircle className="text-gray-400" size={22} />
                <h2 className="text-xl font-bold text-gray-900">
                  Mint daily canvas
                </h2>
            </div>
            
            {/* Segmented Controller / Selector */}
            <div className="flex bg-gray-300/50 p-1 rounded-xl w-full">
              <button 
                onClick={() => setMode('current')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'current' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock size={14} />
                Current
              </button>
              <button 
                onClick={() => setMode('in-progress')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'in-progress' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Paintbrush size={14} />
                In Progress
              </button>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full aspect-square relative bg-gray-50">
            {isLoadingData ? (
                <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            ) : (
                <img 
                src={dailyData.imageUrl} 
                alt={`Day ${dailyData.day}`} 
                className="w-full h-full object-cover transition-opacity duration-300"
                />
            )}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/10">
              {mode === 'current' ? `Day ${dailyData.day}` : `In Progress: #${dailyData.day}`}
            </div>
            {mode === 'in-progress' && (
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg scale-90 sm:scale-100">
                  <Paintbrush className="text-blue-600 animate-pulse" size={16} />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Artists Painting Now</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                {dailyData.title}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
                    <Clock size={12} className="text-gray-400" />
                    {mode === 'current' ? `Minting ends in: ${dailyData.timeLeft}` : `Available to mint in: ${dailyData.timeLeft}`}
                  </span>
              </div>
            </div>
            
            <div className="h-px bg-gray-100 my-1" />

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-50 rounded-xl h-12 border border-gray-200">
                <button 
                  onClick={handleDecrement}
                  disabled={isMinting}
                  className="w-10 h-full flex items-center justify-center text-gray-500 active:bg-gray-200 rounded-l-xl disabled:opacity-50"
                >
                  <Minus size={18} />
                </button>
                <span className="w-8 text-center text-base font-bold text-gray-900 tabular-nums">
                  {quantity}
                </span>
                <button 
                  onClick={handleIncrement}
                  disabled={isMinting}
                  className="w-10 h-full flex items-center justify-center text-gray-500 active:bg-gray-200 rounded-r-xl disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              <button 
                onClick={handleMint}
                disabled={isMinting}
                style={{ backgroundColor: '#2563eb' }}
                className="flex-1 text-white text-sm font-bold h-12 rounded-xl hover:opacity-90 active:opacity-100 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isMinting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{mode === 'current' ? 'Minting...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>{address ? (mode === 'current' ? 'Mint' : 'Pre-order') : (mode === 'current' ? 'Connect & Mint' : 'Connect & Pre-order')}</span>
                    <span className="opacity-40 font-light">|</span> 
                    <span>{totalPrice} ETH</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="w-full aspect-square mx-auto mt-2 mb-6 rounded-2xl shadow-lg overflow-hidden bg-gray-50">
              <img 
                src={dailyData.imageUrl} 
                alt={`Day ${dailyData.day}`} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                {mode === 'current' ? 'Mint Successful!' : 'Pre-order Received!'}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                (Mock) You {mode === 'current' ? 'minted' : 'pre-ordered'} {quantity}x <strong>{dailyData.title}</strong>.
              </p>
            </div>
            <button 
              onClick={handleShare}
              style={{ backgroundColor: '#2563eb' }}
              className="w-full hover:opacity-90 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Share size={18} />
              Share
            </button>
          </div>
        </div>
      )}
    </>
  );
});

export default MintSection;