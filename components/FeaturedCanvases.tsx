import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, ExternalLink, ShoppingCart } from 'lucide-react';
import { BASEPAINT_NFT_CONTRACT } from '../constants';
import sdk from '@farcaster/frame-sdk';

interface FeaturedItem {
  tokenId: string;
  imageUrl: string;
  title: string;
  price: string;
}

const MOCK_FEATURED_ITEMS: FeaturedItem[] = [
  {
    tokenId: "542",
    imageUrl: "https://basepaint.xyz/api/art/image?day=542",
    title: "BasePaint #542",
    price: "0.012"
  },
  {
    tokenId: "420",
    imageUrl: "https://basepaint.xyz/api/art/image?day=420",
    title: "BasePaint #420",
    price: "0.069"
  },
  {
    tokenId: "312",
    imageUrl: "https://basepaint.xyz/api/art/image?day=312",
    title: "BasePaint #312",
    price: "0.005"
  },
  {
    tokenId: "101",
    imageUrl: "https://basepaint.xyz/api/art/image?day=101",
    title: "BasePaint #101",
    price: "0.15"
  },
  {
    tokenId: "24",
    imageUrl: "https://basepaint.xyz/api/art/image?day=24",
    title: "BasePaint #24",
    price: "0.22"
  }
];

interface FeaturedCanvasesProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

const FeaturedCanvases: React.FC<FeaturedCanvasesProps> = ({ onShowToast }) => {
  const [items] = useState<FeaturedItem[]>(MOCK_FEATURED_ITEMS);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const handleBuy = useCallback(async (item: FeaturedItem) => {
    setPurchasingId(item.tokenId);
    
    const url = `https://opensea.io/assets/base/${BASEPAINT_NFT_CONTRACT}/${item.tokenId}`;
    
    // Slight delay to show feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
        await sdk.actions.openUrl(url);
        onShowToast(`Opening listing for #${item.tokenId}...`, 'success');
    } catch (e) {
        console.error("Failed to open URL via SDK", e);
        window.open(url, '_blank');
        onShowToast(`Opening OpenSea...`, 'success');
    } finally {
        setPurchasingId(null);
    }
  }, [onShowToast]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} />
            Keep exploring
        </h2>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 no-scrollbar snap-x mandatory cursor-grab"
      >
        {items.map((item) => (
          <div 
            key={item.tokenId} 
            className="snap-center min-w-[170px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-colors animate-in fade-in zoom-in-95 duration-300"
          >
            <div className="relative w-full aspect-square bg-gray-100 group">
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
            <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                 <div className="font-bold text-xs text-gray-900 truncate leading-tight">
                     {item.title}
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-500">Floor Price</span>
                        <span className="text-xs font-bold text-gray-900">
                            {item.price} Ξ
                        </span>
                    </div>
                    <button
                        onClick={() => handleBuy(item)}
                        disabled={purchasingId !== null}
                        className="w-full bg-[#2D2D2D] text-white font-bold py-2 rounded-lg text-xs hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                        {purchasingId === item.tokenId ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <ShoppingCart size={14} />
                                Buy
                            </>
                        )}
                    </button>
                 </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedCanvases;