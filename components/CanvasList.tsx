import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { CanvasItem } from '../types';
import { Loader2, Plus, LayoutGrid, Tag, Check, X, Info, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { BASEPAINT_NFT_CONTRACT, OPENSEA_API_KEY } from '../constants';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

interface CanvasListProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  items: CanvasItem[];
  onUpdateItem: (item: CanvasItem) => void;
  onRemoveItem: (id: string) => void;
  isLoading?: boolean;
}

export interface CanvasListHandle {
  openListing: (item: CanvasItem) => void;
  openAccept: (item: CanvasItem) => void;
}

const ITEMS_PER_PAGE = 9;

const CanvasList = forwardRef<CanvasListHandle, CanvasListProps>(({ 
  onShowToast, 
  items, 
  onUpdateItem, 
  onRemoveItem,
  isLoading 
}, ref) => {
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<'default' | 'price_desc' | 'offer_desc'>('default');
  
  // Modal State
  const [activeModal, setActiveModal] = useState<{ type: 'list' | 'accept', item: CanvasItem } | null>(null);
  const [listingPrice, setListingPrice] = useState<string>('');
  const [listingDuration, setListingDuration] = useState<string>('1 month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  const { address, connect } = useWallet();

  useImperativeHandle(ref, () => ({
    openListing: (item: CanvasItem) => openModal('list', item),
    openAccept: (item: CanvasItem) => openModal('accept', item)
  }));

  const openModal = (type: 'list' | 'accept', item: CanvasItem) => {
    setActiveModal({ type, item });
    setListingPrice(item.listPrice ? item.listPrice.toString() : '');
    setProcessingStep('');
  };

  const closeModal = () => {
    if (isProcessing) return;
    setActiveModal(null);
    setListingPrice('');
    setProcessingStep('');
  };

  const handleListConfirm = async () => {
    if (!activeModal || !address) {
        if (!address) connect();
        return;
    }
    
    if (!listingPrice || isNaN(Number(listingPrice)) || Number(listingPrice) <= 0) {
        onShowToast("Please enter a valid price", 'error');
        return;
    }

    setIsProcessing(true);
    setProcessingStep('Checking approval...');

    try {
        // 1. Mock Approval Check
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 2. Mock Signature
        setProcessingStep('Waiting for signature...');
        // In a real app, we would use sdk.wallet.ethProvider to signTypedData_v4 for Seaport
        // Here we simulate the delay of a wallet interaction
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 3. Post to OpenSea API (Simulated)
        setProcessingStep('Posting listing to OpenSea...');
        
        // Simulating an API call to OpenSea
        // const response = await fetch(`https://api.opensea.io/v2/orders/base/seaport/listings`, {
        //     method: 'POST',
        //     headers: { 
        //         'Content-Type': 'application/json',
        //         'X-API-KEY': OPENSEA_API_KEY
        //     },
        //     body: JSON.stringify({ /* complex seaport order */ })
        // });
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Success Update
        const updatedItem = { ...activeModal.item, isListed: true, listPrice: Number(listingPrice) };
        onUpdateItem(updatedItem);
        onShowToast(`Successfully listed BasePaint #${activeModal.item.day} for ${listingPrice} ETH`, 'success');
        closeModal();

    } catch (error) {
        console.error("Listing failed", error);
        onShowToast("Failed to create listing", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAcceptConfirm = async () => {
     if (!activeModal || !address) {
        if (!address) connect();
        return;
     }

     setIsProcessing(true);
     setProcessingStep('Fetching offer details...');

     try {
         // 1. Fetch Offer (Mock)
         await new Promise(resolve => setTimeout(resolve, 600));

         // 2. Check Approval
         setProcessingStep('Checking approval...');
         await new Promise(resolve => setTimeout(resolve, 600));

         // 3. Mock Execution Transaction
         setProcessingStep('Confirming transaction...');
         await new Promise(resolve => setTimeout(resolve, 2000));

         // Success
         onRemoveItem(activeModal.item.id);
         onShowToast(`Successfully sold BasePaint #${activeModal.item.day} for ${activeModal.item.bestOffer} ETH`, 'success');
         closeModal();

     } catch (error) {
         console.error("Accept offer failed", error);
         onShowToast("Failed to accept offer", 'error');
     } finally {
         setIsProcessing(false);
     }
  };

  const sortedItems = useMemo(() => {
    const itemsToSort = [...items];
    switch (sortOption) {
      case 'price_desc':
        return itemsToSort.sort((a, b) => (b.listPrice || 0) - (a.listPrice || 0));
      case 'offer_desc':
        return itemsToSort.sort((a, b) => (b.bestOffer || 0) - (a.bestOffer || 0));
      default:
        return itemsToSort.sort((a, b) => b.day - a.day);
    }
  }, [items, sortOption]);

  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatPrice = (price?: number) => {
      if (!price) return '--';
      return `${Number(price.toFixed(5))} Ξ`;
  };

  if (items.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
           <p className="text-gray-500 text-sm mb-4">You don't own any canvases yet.</p>
           <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="flex items-center gap-2 bg-[#0052FF] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors">
             <Plus size={16} /> Mint your first canvas
           </button>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
           <LayoutGrid size={18} /> Your Canvases
        </h2>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => setSortOption('price_desc')} className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${sortOption === 'price_desc' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>Price</button>
            <button onClick={() => setSortOption('offer_desc')} className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${sortOption === 'offer_desc' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>Offer</button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {paginatedItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col group transition-colors">
               <div className="relative aspect-square bg-gray-100">
                  <img src={item.imageUrl} alt={item.id} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">#{item.day}</div>
               </div>
               <div className="p-2.5 flex flex-col gap-2 flex-1">
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="text-gray-500">List Price</div>
                      <div className="text-right font-bold text-gray-900">{formatPrice(item.listPrice)}</div>
                      <div className="text-gray-500">Best Offer</div>
                      <div className="text-right font-bold text-gray-900">{formatPrice(item.bestOffer)}</div>
                  </div>
                  <div className="mt-auto flex gap-2">
                     <button 
                        onClick={() => openModal('list', item)} 
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-transparent hover:border-gray-300"
                     >
                        {item.isListed ? (
                          <>Edit <Tag size={10} className="opacity-50" /></>
                        ) : (
                          <>List <Tag size={10} className="opacity-50" /></>
                        )}
                     </button>
                     {item.bestOffer > 0 && (
                        <button 
                            onClick={() => openModal('accept', item)} 
                            className="flex-1 bg-[#2563eb]/10 hover:bg-[#2563eb]/20 text-blue-700 text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-transparent hover:border-blue-200"
                        >
                            Accept <Check size={10} className="opacity-50" />
                        </button>
                     )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Trade Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                <button 
                    onClick={closeModal}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5 transition-colors z-10"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                        <img src={activeModal.item.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">BasePaint #{activeModal.item.day}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">Token ID: {activeModal.item.id}</span>
                        </div>
                    </div>
                </div>

                {activeModal.type === 'list' ? (
                    <>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Tag size={16} /> Set Listing Price
                        </h4>
                        
                        <div className="space-y-4 mb-6">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <DollarSign size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    value={listingPrice}
                                    onChange={(e) => setListingPrice(e.target.value)}
                                    placeholder="Amount in ETH"
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                                    step="0.0001"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ETH</div>
                            </div>

                            <div className="flex gap-2">
                                {['1 day', '3 days', '1 month', '6 months'].map((dur) => (
                                    <button 
                                        key={dur}
                                        onClick={() => setListingDuration(dur)}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${
                                            listingDuration === dur 
                                                ? 'bg-black text-white border-black' 
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {dur}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-xl mb-6 flex gap-3 items-start">
                            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-blue-700 leading-relaxed">
                                Listing is gas-free after approval. You will be asked to sign a message to create the listing on OpenSea.
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                         <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600" /> Best Offer
                        </h4>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex flex-col items-center justify-center text-center">
                            <div className="text-xs text-gray-500 font-medium mb-1">Top offer from 0x7a...3b9</div>
                            <div className="text-3xl font-bold text-gray-900">{activeModal.item.bestOffer} ETH</div>
                            <div className="text-xs text-gray-400 mt-1">~$51.20 USD</div>
                        </div>

                         <div className="bg-amber-50 p-3 rounded-xl mb-6 flex gap-3 items-start">
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-amber-700 leading-relaxed">
                                Accepting an offer requires a gas transaction. You will swap your NFT for WETH immediately.
                            </div>
                        </div>
                    </>
                )}

                <button 
                    onClick={activeModal.type === 'list' ? handleListConfirm : handleAcceptConfirm}
                    disabled={isProcessing}
                    className="w-full bg-[#2D2D2D] hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>{processingStep}</span>
                        </>
                    ) : (
                        activeModal.type === 'list' 
                            ? (activeModal.item.isListed ? 'Update Listing' : 'Complete Listing') 
                            : 'Accept Offer'
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
});

export default CanvasList;