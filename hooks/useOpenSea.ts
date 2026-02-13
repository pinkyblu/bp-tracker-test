import { useState, useCallback } from 'react';
import { OpenSeaSDK, Chain } from 'opensea-js';
import { ethers } from 'ethers';
import { BASEPAINT_NFT_CONTRACT, OPENSEA_API_KEY } from '../constants';
import { CanvasItem } from '../types';

const COLLECTION_SLUG = 'basepaint';
const BASE_CHAIN = Chain.Base;
const OS_BASE_URL  = 'https://api.opensea.io/api/v2';
const CHAIN_NAME   = 'base';

// Headers for all REST calls
const osHeaders = () => ({
  'accept': 'application/json',
  'x-api-key': OPENSEA_API_KEY,
});

// Build SDK with user wallet (needed only for signing / sending txs)
function buildSDK(provider: any): OpenSeaSDK {
  const ethersProvider = new ethers.BrowserProvider(provider);
  return new OpenSeaSDK(ethersProvider, {
    chain: BASE_CHAIN,
    apiKey: OPENSEA_API_KEY,
  });
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

// GET /chain/{chain}/account/{address}/nfts  – paginated, filter by contract
async function fetchNFTsByOwner(address: string): Promise<CanvasItem[]> {
  const results: CanvasItem[] = [];
  let next: string | null = null;

  do {
    const url = new URL(`${OS_BASE_URL}/chain/${CHAIN_NAME}/account/${address}/nfts`);
    url.searchParams.set('limit', '200');
    url.searchParams.set('collection', COLLECTION_SLUG);
    if (next) url.searchParams.set('next', next);

    const res = await fetch(url.toString(), { headers: osHeaders() });
    if (!res.ok) throw new Error(`OpenSea NFTs error: ${res.status}`);
    const data = await res.json();

    for (const nft of (data.nfts ?? [])) {
      const tokenId = String(nft.identifier);
      const day = parseInt(tokenId, 10);
      results.push({
        id: tokenId,
        day,
        imageUrl: `https://basepaint.xyz/api/art/image?day=${day}`,
        lastSale: 0,
        bestOffer: 0,
        listPrice: undefined,
        isListed: false,
      });
    }

    next = data.next ?? null;
  } while (next && results.length < 500);

  return results;
}

// GET /listings/collection/{slug}/best  – cheapest listing per token_id
async function fetchBestListing(tokenId: string): Promise<{ listPrice?: number; isListed: boolean }> {
  try {
    const url = `${OS_BASE_URL}/listings/collection/${COLLECTION_SLUG}/best?limit=1&token_ids=${tokenId}`;
    const res = await fetch(url, { headers: osHeaders() });
    if (!res.ok) return { isListed: false };
    const data = await res.json();
    const listing = data.listings?.[0];
    if (!listing) return { isListed: false };

    const raw = listing.price?.current?.value;
    const decimals = listing.price?.current?.decimals ?? 18;
    if (!raw) return { isListed: false };

    return {
      listPrice: parseFloat(ethers.formatUnits(raw, decimals)),
      isListed: true,
    };
  } catch {
    return { isListed: false };
  }
}

// GET /offers/collection/{slug}/best  – best offer for a token
async function fetchBestOffer(tokenId: string): Promise<{ bestOffer: number; orderHash?: string; protocolAddress?: string }> {
  try {
    const url = `${OS_BASE_URL}/offers/collection/${COLLECTION_SLUG}/best?limit=1&token_ids=${tokenId}`;
    const res = await fetch(url, { headers: osHeaders() });
    if (!res.ok) return { bestOffer: 0 };
    const data = await res.json();
    const offer = data.offers?.[0];
    if (!offer) return { bestOffer: 0 };

    const raw = offer.price?.value;
    const decimals = offer.price?.decimals ?? 18;
    if (!raw) return { bestOffer: 0 };

    return {
      bestOffer: parseFloat(ethers.formatUnits(raw, decimals)),
      orderHash: offer.order_hash,
      protocolAddress: offer.protocol_address,
    };
  } catch {
    return { bestOffer: 0 };
  }
}

// GET /listings/collection/{slug}/all  – all active listings for the collection
async function fetchCollectionListings(limit: number): Promise<FloorListing[]> {
  const url = `${OS_BASE_URL}/listings/collection/${COLLECTION_SLUG}/all?limit=${limit}`;
  const res = await fetch(url, { headers: osHeaders() });
  if (!res.ok) throw new Error(`OpenSea listings error: ${res.status}`);
  const data = await res.json();

  const listings: FloorListing[] = [];
  for (const listing of (data.listings ?? [])) {
    const tokenId = String(
      listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ?? '0'
    );
    const raw      = listing.price?.current?.value;
    const decimals = listing.price?.current?.decimals ?? 18;
    const priceEth = raw ? parseFloat(ethers.formatUnits(raw, decimals)) : 0;
    if (!priceEth || tokenId === '0') continue;

    listings.push({
      orderHash:       listing.order_hash,
      protocolAddress: listing.protocol_address,
      tokenId,
      priceEth,
      imageUrl: `https://basepaint.xyz/api/art/image?day=${tokenId}`,
    });
  }

  // Shuffle for a random "explore" feel
  return listings.sort(() => Math.random() - 0.5);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOpenSea() {
  const [isLoadingNFTs,    setIsLoadingNFTs]    = useState(false);
  const [isLoadingOffers,  setIsLoadingOffers]  = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  // 1. Fetch owned BasePaints
  const fetchOwnedBasePaints = useCallback(async (walletAddress: string): Promise<CanvasItem[]> => {
    setIsLoadingNFTs(true);
    setError(null);
    try {
      return await fetchNFTsByOwner(walletAddress);
    } catch (err: any) {
      console.error('fetchOwnedBasePaints:', err);
      setError(err?.message || 'Failed to fetch NFTs');
      return [];
    } finally {
      setIsLoadingNFTs(false);
    }
  }, []);

  // 2. Enrich items with live market data (batched, with progress callback)
  const enrichWithMarketData = useCallback(async (
    items: CanvasItem[],
    onProgress?: (updated: CanvasItem[]) => void
  ): Promise<CanvasItem[]> => {
    setIsLoadingOffers(true);
    const enriched = [...items];
    const BATCH = 4; // conservative to avoid rate limits

    for (let i = 0; i < enriched.length; i += BATCH) {
      await Promise.all(
        enriched.slice(i, i + BATCH).map(async (_, idx) => {
          const item = enriched[i + idx];
          const [listingData, offerData] = await Promise.all([
            fetchBestListing(item.id),
            fetchBestOffer(item.id),
          ]);
          enriched[i + idx] = {
            ...item,
            listPrice:              listingData.listPrice,
            isListed:               listingData.isListed,
            bestOffer:              offerData.bestOffer,
            bestOfferOrderHash:     offerData.orderHash,
            bestOfferProtocolAddress: offerData.protocolAddress,
          };
        })
      );
      if (onProgress) onProgress([...enriched]);
    }

    setIsLoadingOffers(false);
    return enriched;
  }, []);

  // 3. Create a listing via opensea-js SDK (handles Seaport signing)
  const createListing = useCallback(async (
    walletProvider: any,
    accountAddress: string,
    tokenId: string,
    priceInEth: number,
    durationDays: number
  ): Promise<void> => {
    const sdk = buildSDK(walletProvider);
    const expirationTime = Math.round(Date.now() / 1000 + durationDays * 86400);
    await sdk.createListing({
      asset: { tokenId, tokenAddress: BASEPAINT_NFT_CONTRACT },
      accountAddress,
      startAmount: priceInEth,
      expirationTime,
    });
  }, []);

  // 4. Fulfill an offer (accept best offer on your NFT)
  const fulfillOffer = useCallback(async (
    walletProvider: any,
    accountAddress: string,
    orderHash: string,
    protocolAddress: string
  ): Promise<string> => {
    const sdk = buildSDK(walletProvider);
    const order = await sdk.api.getOrder({ orderHash, protocolAddress, side: 'offer' } as any);
    const txHash = await sdk.fulfillOrder({ order, accountAddress });
    return typeof txHash === 'string' ? txHash : (txHash as any)?.hash || '';
  }, []);

  // 5. Fetch floor listings for "Keep exploring"
  const fetchFloorListings = useCallback(async (limit = 10): Promise<FloorListing[]> => {
    try {
      return await fetchCollectionListings(limit);
    } catch (err: any) {
      console.error('fetchFloorListings:', err);
      return [];
    }
  }, []);

  // 6. Buy a listing (fulfill as buyer)
  const fulfillListing = useCallback(async (
    walletProvider: any,
    accountAddress: string,
    orderHash: string,
    protocolAddress: string
  ): Promise<string> => {
    const sdk = buildSDK(walletProvider);
    const order = await sdk.api.getOrder({ orderHash, protocolAddress, side: 'ask' } as any);
    const txHash = await sdk.fulfillOrder({ order, accountAddress });
    return typeof txHash === 'string' ? txHash : (txHash as any)?.hash || '';
  }, []);

  return {
    isLoadingNFTs,
    isLoadingOffers,
    error,
    fetchOwnedBasePaints,
    enrichWithMarketData,
    createListing,
    fulfillOffer,
    fetchFloorListings,
    fulfillListing,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloorListing {
  orderHash: string;
  protocolAddress: string;
  tokenId: string;
  priceEth: number;
  imageUrl: string;
}
