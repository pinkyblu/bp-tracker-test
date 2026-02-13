import React, { useState } from 'react';
import { ShoppingCart, Loader2, RefreshCw } from 'lucide-react';

interface FloorItem {
  orderHash: string;
  price: string;
  tokenId: string;
  imageUrl: string;
}

const MOCK_FLOOR_ITEMS: FloorItem[] = [
  {
    orderHash: "mock-1",
    price: "0.0031",
    tokenId: "695",
    imageUrl: "https://basepaint.xyz/api/art/image?day=695"
  },
  {
    orderHash: "mock-2",
    price: "0.0032",
    tokenId: "688",
    imageUrl: "https://basepaint.xyz/api/art/image?day=688"
  },
  {
    orderHash: "mock-3",
    price: "0.0035",
    tokenId: "672",
    imageUrl: "https://basepaint.xyz/api/art/image?day=672"
  }
];

interface FloorSweeperProps {
  onShowToast: (msg: string) => void;
}

const FloorSweeper: React.FC<FloorSweeperProps> = ({ onShowToast }) => {
  const [items] = useState<FloorItem[]>(MOCK_FLOOR_ITEMS);
  const [loading, setLoading] = useState(false);
  const [purchasingHash, setPurchasingHash] = useState<string | null>(null);

  const handleBuy = async (item: FloorItem) => {
    setPurchasingHash(item.orderHash);
    // Mock purchase delay
    setTimeout(() => {
      onShowToast(`Successfully purchased #${item.tokenId} (Mock Transaction)`);
      setPurchasingHash(null);
    }, 1500);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onShowToast("Market data refreshed (Mock)");
    }, 1000);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={18} />
            Floor Display
        </h2>
        <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
        >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      
      <div className="flex flex-col gap-3">
        {loading ? (
            <div className="py-8 flex justify-center text-gray-400">
                <Loader2 className="animate-spin" size={24} />
            </div>
        ) : (
            items.map((item) => (
                <div key={item.orderHash} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                        <img src={item.imageUrl} alt={`#${item.tokenId}`} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">
                            BasePaint #{item.tokenId}
                        </div>
                        <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                             Price: <span className="text-gray-900">{item.price} Ξ</span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleBuy(item)}
                        disabled={purchasingHash !== null}
                        className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-50 transition-opacity whitespace-nowrap min-w-[70px] flex justify-center"
                    >
                        {purchasingHash === item.orderHash ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            "Buy"
                        )}
                    </button>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default FloorSweeper;