import React, { useState, useImperativeHandle, forwardRef, useMemo, useEffect, useCallback } from 'react';
import { CanvasItem } from '../types';
import {
  Loader2, LayoutGrid, Tag, Check, X, Info,
  DollarSign, CheckCircle2, RefreshCw, ExternalLink
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useOpenSea } from '../hooks/useOpenSea';
import sdk from '@farcaster/frame-sdk';

interface CanvasListProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export interface CanvasListHandle {
  openListing: (item: CanvasItem) => void;
  openAccept:  (item: CanvasItem) => void;
}

const DURATION_OPTIONS = [
  { label: '1 day',    days: 1   },
  { label: '3 days',  days: 3   },
  { label: '1 month', days: 30  },
  { label: '6 months',days: 180 },
];

const CanvasList = forwardRef<CanvasListHandle, CanvasListProps>(({ onShowToast }, ref) => {
  const { address, connect } = useWallet();
  const {
    isLoadingNFTs,
    isLoadingOffers,
    fetchOwnedBasePaints,
    enrichWithMarketData,
    createListing,
    fulfillOffer,
  } = useOpenSea();

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'price_desc' | 'offer_desc'>('default');

  const [activeModal, setActiveModal]         = useState<{ type: 'list' | 'accept'; item: CanvasItem } | null>(null);
  const [listingPrice, setListingPrice]       = useState('');
  const [listingDuration, setListingDuration] = useState(DURATION_OPTIONS[2]);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [processingStep, setProcessingStep]   = useState('');

  useImperativeHandle(ref, () => ({
    openListing: (item) => openModal('list', item),
    openAccept:  (item) => openModal('accept', item),
  }));

  const loadData = useCallback(async () => {
    if (!address) return;
    setHasLoaded(false);
    const owned = await fetchOwnedBasePaints(address);
    setItems(owned);
    setHasLoaded(true);
    if (owned.length === 0) return;
    await enrichWithMarketData(owned, (updated) => setItems([...updated]));
  }, [address, fetchOwnedBasePaints, enrichWithMarketData]);

  useEffect(() => {
    if (address) loadData();
    else { setItems([]); setHasLoaded(false); }
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = (type: 'list' | 'accept', item: CanvasItem) => {
    setActiveModal({ type, item });
    setListingPrice(item.listPrice ? item.listPrice.toString() : '');
    setListingDuration(DURATION_OPTIONS[2]);
    setProcessingStep('');
  };

  const closeModal = () => {
    if (isProcessing) return;
    setActiveModal(null);
    setListingPrice('');
    setProcessingStep('');
  };

  const handleListConfirm = async () => {
    if (!activeModal || !address) { if (!address) connect(); return; }
    if (!listingPrice || isNaN(Number(listingPrice)) || Number(listingPrice) <= 0) {
      onShowToast('Please enter a valid price', 'error'); return;
    }
    setIsProcessing(true);
    try {
      const provider = (sdk as any)?.wallet?.ethProvider || window.ethereum;
      if (!provider) throw new Error('No wallet provider found');
      setProcessingStep('Waiting for signature...');
      await createListing(provider, address, activeModal.item.id, Number(listingPrice), listingDuration.days);
      setItems(prev => prev.map(it =>
        it.id === activeModal.item.id ? { ...it, isListed: true, listPrice: Number(listingPrice) } : it
      ));
      onShowToast(`Listed BasePaint #${activeModal.item.day} for ${listingPrice} ETH ✓`, 'success');
      closeModal();
    } catch (err: any) {
      const msg = err?.message?.includes('rejected') ? 'Listing cancelled' : (err?.message || 'Failed to create listing');
      onShowToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleAcceptConfirm = async () => {
    if (!activeModal || !address) { if (!address) connect(); return; }
    const { item } = activeModal;
    if (!item.bestOfferOrderHash) { onShowToast('No valid offer found', 'error'); return; }

    const protocolAddress = '0x0000000000000068F116a894984e2DB1123eB395'; // Seaport v1.6 Base

    setIsProcessing(true);
    try {
      const provider = (sdk as any)?.wallet?.ethProvider || window.ethereum;
      if (!provider) throw new Error('No wallet provider found');
      setProcessingStep('Sending transaction...');
      const txHash = await fulfillOffer(provider, address, item.bestOfferOrderHash, protocolAddress);
      setItems(prev => prev.filter(it => it.id !== item.id));
      onShowToast(`Sold BasePaint #${item.day} for ${item.bestOffer} ETH ✓`, 'success');
      if (txHash) {
        const url = `https://basescan.org/tx/${txHash}`;
        sdk.actions.openUrl(url).catch(() => window.open(url, '_blank'));
      }
      closeModal();
    } catch (err: any) {
      const msg = err?.message?.includes('rejected') ? 'Transaction cancelled' : (err?.message || 'Failed to accept offer');
      onShowToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortOption === 'price_desc') return copy.sort((a, b) => (b.listPrice || 0) - (a.listPrice || 0));
    if (sortOption === 'offer_desc') return copy.sort((a, b) => (b.bestOffer  || 0) - (a.bestOffer  || 0));
    return copy.sort((a, b) => b.day - a.day);
  }, [items, sortOption]);

  const formatPrice = (price?: number) => !price ? '--' : `${Number(price.toFixed(5))} Ξ`;

  // ── Not connected
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
        <p className="text-gray-500 text-sm mb-4 text-center px-4">Connect your wallet to see your BasePaint canvases.</p>
        <button onClick={connect} className="bg-[#0052FF] text-white px-5 py-2.5 rounded-xl font-bold text-xs">Connect Wallet</button>
      </div>
    );
  }

  // ── Loading NFTs
  if (isLoadingNFTs && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-200">
        <Loader2 className="animate-spin text-gray-400 mb-3" size={28} />
        <p className="text-gray-500 text-sm">Loading your canvases...</p>
      </div>
    );
  }

  // ── Empty
  if (hasLoaded && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
        <p className="text-gray-500 text-sm mb-1">You don't own any BasePaint canvases yet.</p>
        <p className="text-gray-400 text-xs">Mint your first one above!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative">

      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <LayoutGrid size={18} /> Your Canvases
          {isLoadingOffers && (
            <span className="flex items-center gap-1 text-[10px] font-normal text-gray-400">
              <Loader2 size={11} className="animate-spin" /> loading prices...
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setSortOption('price_desc')} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border ${sortOption === 'price_desc' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>Price</button>
          <button onClick={() => setSortOption('offer_desc')} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border ${sortOption === 'offer_desc' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>Offer</button>
          <button onClick={loadData} disabled={isLoadingNFTs || isLoadingOffers} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-40" title="Refresh">
            <RefreshCw size={13} className={isLoadingNFTs ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sortedItems.map(item => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col">
            <div className="relative aspect-square bg-gray-100">
              <img src={item.imageUrl} alt={`#${item.day}`} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">#{item.day}</div>
              {item.isListed && (
                <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Listed</div>
              )}
            </div>
            <div className="p-2.5 flex flex-col gap-2 flex-1">
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="text-gray-500">List Price</div>
                <div className="text-right font-bold text-gray-900">{formatPrice(item.listPrice)}</div>
                <div className="text-gray-500">Best Offer</div>
                <div className={`text-right font-bold ${item.bestOffer > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {item.bestOffer > 0 ? formatPrice(item.bestOffer) : '--'}
                </div>
              </div>
              <div className="mt-auto flex gap-1.5">
                <button onClick={() => openModal('list', item)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 border border-transparent hover:border-gray-300">
                  {item.isListed ? <>Edit <Tag size={10} /></> : <>List <Tag size={10} /></>}
                </button>
                {item.bestOffer > 0 && item.bestOfferOrderHash && (
                  <button onClick={() => openModal('accept', item)} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 border border-transparent hover:border-green-200">
                    Accept <Check size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">

            <button onClick={closeModal} disabled={isProcessing} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5 z-10 disabled:opacity-40">
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                <img src={activeModal.item.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">BasePaint #{activeModal.item.day}</h3>
                <button
                  onClick={() => {
                    const url = `https://opensea.io/assets/base/0xba5e05cb26b78eda3a2f8e3b3814726305dcac83/${activeModal.item.id}`;
                    sdk.actions.openUrl(url).catch(() => window.open(url, '_blank'));
                  }}
                  className="text-xs text-blue-500 flex items-center gap-1 mt-0.5 hover:underline"
                >
                  View on OpenSea <ExternalLink size={10} />
                </button>
              </div>
            </div>

            {activeModal.type === 'list' ? (
              <>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Tag size={16} /> Set Listing Price</h4>
                <div className="space-y-3 mb-5">
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="Amount in ETH" className="w-full pl-9 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5" step="0.0001" min="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ETH</span>
                  </div>
                  <div className="flex gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button key={opt.label} onClick={() => setListingDuration(opt)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${listingDuration.label === opt.label ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl mb-5 flex gap-3 items-start">
                  <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">Listing is gas-free. You'll sign a message to create the order on OpenSea Seaport.</p>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-600" /> Best Offer</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex flex-col items-center text-center">
                  <div className="text-xs text-gray-500 font-medium mb-1">Best active offer</div>
                  <div className="text-3xl font-bold text-gray-900">{activeModal.item.bestOffer} Ξ</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl mb-5 flex gap-3 items-start">
                  <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">Accepting requires a gas transaction. Your NFT will be exchanged for WETH immediately on-chain.</p>
                </div>
              </>
            )}

            <button
              onClick={activeModal.type === 'list' ? handleListConfirm : handleAcceptConfirm}
              disabled={isProcessing}
              className="w-full bg-[#2D2D2D] hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /><span>{processingStep || 'Processing...'}</span></>
              ) : (
                activeModal.type === 'list'
                  ? (activeModal.item.isListed ? 'Update Listing' : 'Create Listing')
                  : `Accept ${activeModal.item.bestOffer} Ξ Offer`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default CanvasList;
