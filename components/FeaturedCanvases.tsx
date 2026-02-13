import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RefreshCw, ShoppingCart } from 'lucide-react';
import { useOpenSea, FloorListing } from '../hooks/useOpenSea';
import { useWallet } from '../hooks/useWallet';
import sdk from '@farcaster/frame-sdk';

interface FeaturedCanvasesProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

const FeaturedCanvases: React.FC<FeaturedCanvasesProps> = ({ onShowToast }) => {
  const { address, connect } = useWallet();
  const { fetchFloorListings, fulfillListing } = useOpenSea();

  const [items, setItems]         = useState<FloorListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId]   = useState<string | null>(null); // orderHash being bought

  // ── Load floor listings on mount ─────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    const listings = await fetchFloorListings(8);
    setItems(listings);
    setIsLoading(false);
  }, [fetchFloorListings]);

  useEffect(() => { load(); }, [load]);

  // ── Buy a listing directly on-chain ──────────────────────────────────────
  const handleBuy = useCallback(async (item: FloorListing) => {
    if (!address) {
      await connect();
      return;
    }

    setBuyingId(item.orderHash);
    try {
      const provider = (sdk as any)?.wallet?.ethProvider || window.ethereum;
      if (!provider) throw new Error('No wallet provider found');

      const txHash = await fulfillListing(
        provider,
        address,
        item.orderHash,
        item.protocolAddress
      );

      // Remove bought item from the list
      setItems(prev => prev.filter(i => i.orderHash !== item.orderHash));
      onShowToast(`Bought BasePaint #${item.tokenId} for ${item.priceEth} ETH ✓`, 'success');
    } catch (err: any) {
      const msg = err?.message?.includes('rejected')
        ? 'Purchase cancelled'
        : err?.message || 'Failed to complete purchase';
      onShowToast(msg, 'error');
    } finally {
      setBuyingId(null);
    }
  }, [address, connect, fulfillListing, onShowToast]);

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} />
          Keep exploring
        </h2>
        <button
          onClick={load}
          disabled={isLoading}
          className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-40"
          title="Refresh listings"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-4 no-scrollbar">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[160px] bg-white rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-7 bg-gray-100 rounded-lg mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No listings found right now.</p>
          <button onClick={load} className="mt-3 text-xs text-blue-500 hover:underline">Try again</button>
        </div>
      ) : (
        /* Horizontal scroll list */
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 no-scrollbar snap-x snap-mandatory">
          {items.map((item) => (
            <div
              key={item.orderHash}
              className="snap-center min-w-[160px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-shrink-0"
            >
              {/* Image */}
              <div className="relative w-full aspect-square bg-gray-100">
                <img
                  src={item.imageUrl}
                  alt={`#${item.tokenId}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                  #{item.tokenId}
                </div>
              </div>

              {/* Info + Buy */}
              <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                <div className="font-bold text-xs text-gray-900 leading-tight">
                  BasePaint #{item.tokenId}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500">Price</span>
                    <span className="text-xs font-bold text-gray-900">
                      {item.priceEth.toFixed(5)} Ξ
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId !== null}
                    className="w-full bg-[#2D2D2D] hover:bg-black text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {buyingId === item.orderHash ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart size={13} />
                        {address ? 'Buy' : 'Connect & Buy'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCanvases;
