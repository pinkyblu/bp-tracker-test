import { useState, useCallback } from 'react';
import { OpenSeaSDK, Chain, OrderSide } from 'opensea-js';
import { ethers } from 'ethers';
import { BASEPAINT_NFT_CONTRACT, OPENSEA_API_KEY } from '../constants';
import { CanvasItem } from '../types';

const COLLECTION_SLUG = 'basepaint';
const BASE_CHAIN = Chain.Base;

// Helper to build the SDK with the user's provider (needed for signing)
function buildSDK(provider: any): OpenSeaSDK {
  const ethersProvider = new ethers.BrowserProvider(provider);
  return new OpenSeaSDK(ethersProvider, {
    chain: BASE_CHAIN,
    apiKey: OPENSEA_API_KEY,
  });
}

// Helper to build a read-only SDK (no wallet needed, for data fetching)
function buildReadSDK(): OpenSeaSDK {
  const readProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  return new OpenSeaSDK(readProvider as any, {
    chain: BASE_CHAIN,
    apiKey: OPENSEA_API_KEY,
  });
}

export function useOpenSea() {
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── 1. Fetch NFTs owned by a wallet that belong to BasePaint ────────────
  const fetchOwnedBasePaints = useCallback(async (
    walletAddress: string
  ): Promise<CanvasItem[]> => {
    setIsLoadingNFTs(true);
    setError(null);
    try {
      const sdk = buildReadSDK();
      // Paginate through all NFTs owned by the account, filter to BasePaint contract
      const results: CanvasItem[] = [];
      let cursor: string | undefined = undefined;

      do {
        const { nfts, next } = await sdk.api.getNFTsByAccount(
          walletAddress,
          50,
          cursor,
          BASE_CHAIN
        );

        for (const nft of nfts) {
          if (
            nft.contract?.toLowerCase() === BASEPAINT_NFT_CONTRACT.toLowerCase()
          ) {
            const tokenId = nft.identifier;
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
        }
        cursor = next || undefined;
        // Safety stop: avoid infinite loops if the API has many pages
        if (!next) break;
      } while (cursor && results.length < 200);

      return results;
    } catch (err: any) {
      console.error('fetchOwnedBasePaints error:', err);
      setError(err?.message || 'Failed to fetch owned NFTs');
      return [];
    } finally {
      setIsLoadingNFTs(false);
    }
  }, []);

  // ─── 2. Fetch best offer + current listing for a single token ────────────
  const fetchTokenMarketData = useCallback(async (
    tokenId: string
  ): Promise<{ bestOffer: number; listPrice?: number; isListed: boolean; bestOfferOrderHash?: string }> => {
    try {
      const sdk = buildReadSDK();

      // Fetch best offer
      let bestOffer = 0;
      let bestOfferOrderHash: string | undefined;
      try {
        const offer = await sdk.api.getBestOffer(COLLECTION_SLUG, tokenId);
        if (offer?.price?.decimals !== undefined && offer?.price?.value) {
          bestOffer = parseFloat(
            ethers.formatUnits(offer.price.value, offer.price.decimals)
          );
          bestOfferOrderHash = (offer as any).order_hash;
        }
      } catch {
        // No offer exists for this token — that's fine
      }

      // Fetch best listing (cheapest active ask)
      let listPrice: number | undefined;
      let isListed = false;
      try {
        const listing = await sdk.api.getBestListing(COLLECTION_SLUG, tokenId);
        if (listing?.price?.decimals !== undefined && listing?.price?.value) {
          listPrice = parseFloat(
            ethers.formatUnits(listing.price.value, listing.price.decimals)
          );
          isListed = true;
        }
      } catch {
        // No listing exists — that's fine
      }

      return { bestOffer, listPrice, isListed, bestOfferOrderHash };
    } catch (err: any) {
      console.error(`fetchTokenMarketData error for ${tokenId}:`, err);
      return { bestOffer: 0, isListed: false };
    }
  }, []);

  // ─── 3. Enrich a list of CanvasItems with live market data ───────────────
  const enrichWithMarketData = useCallback(async (
    items: CanvasItem[],
    onProgress?: (updated: CanvasItem[]) => void
  ): Promise<CanvasItem[]> => {
    setIsLoadingOffers(true);
    const enriched = [...items];

    // Fetch in parallel batches of 5 to avoid rate limiting
    const BATCH = 5;
    for (let i = 0; i < enriched.length; i += BATCH) {
      const batch = enriched.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (item, idx) => {
          const data = await fetchTokenMarketData(item.id);
          enriched[i + idx] = {
            ...enriched[i + idx],
            bestOffer: data.bestOffer,
            listPrice: data.listPrice,
            isListed: data.isListed,
            bestOfferOrderHash: data.bestOfferOrderHash,
          };
        })
      );
      // Notify progress so UI can update incrementally
      if (onProgress) onProgress([...enriched]);
    }

    setIsLoadingOffers(false);
    return enriched;
  }, [fetchTokenMarketData]);

  // ─── 4. Create a listing on OpenSea ──────────────────────────────────────
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
      asset: {
        tokenId,
        tokenAddress: BASEPAINT_NFT_CONTRACT,
      },
      accountAddress,
      startAmount: priceInEth,
      expirationTime,
    });
  }, []);

  // ─── 5. Fulfill (accept) an offer ────────────────────────────────────────
  const fulfillOffer = useCallback(async (
    walletProvider: any,
    accountAddress: string,
    orderHash: string,
    protocolAddress: string
  ): Promise<string> => {
    const sdk = buildSDK(walletProvider);

    // Get the full order object by hash
    const order = await sdk.api.getOrderByHash(
      orderHash,
      protocolAddress,
      BASE_CHAIN
    );

    // Fulfill the order (this sends the on-chain tx)
    const txHash = await sdk.fulfillOrder({
      order,
      accountAddress,
    });

    return typeof txHash === 'string' ? txHash : (txHash as any)?.hash || '';
  }, []);

  // ─── 6. Fetch cheapest active listings for the collection (floor) ────────
  const fetchFloorListings = useCallback(async (limit = 8): Promise<FloorListing[]> => {
    try {
      const sdk = buildReadSDK();
      // Fetch listings and shuffle for a random "explore" feel
      const { orders } = await sdk.api.getListings({
        assetContractAddress: BASEPAINT_NFT_CONTRACT,
        tokenIds: undefined,
        side: OrderSide.ASK,
        limit,
      });

      return orders.map((order: any) => {
        const tokenId = order.taker_asset_bundle?.assets?.[0]?.token_id
          ?? order.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria
          ?? '0';
        const priceEth = order.current_price
          ? parseFloat(ethers.formatEther(order.current_price))
          : 0;
        return {
          orderHash: order.order_hash,
          protocolAddress: order.protocol_address,
          tokenId: String(tokenId),
          priceEth,
          imageUrl: `https://basepaint.xyz/api/art/image?day=${tokenId}`,
        };
      }).filter((l: FloorListing) => l.priceEth > 0).sort(() => Math.random() - 0.5);
    } catch (err: any) {
      console.error('fetchFloorListings error:', err);
      return [];
    }
  }, []);

  // ─── 7. Fulfill (buy) a listing ──────────────────────────────────────────
  const fulfillListing = useCallback(async (
    walletProvider: any,
    accountAddress: string,
    orderHash: string,
    protocolAddress: string
  ): Promise<string> => {
    const sdk = buildSDK(walletProvider);

    const order = await sdk.api.getOrderByHash(
      orderHash,
      protocolAddress,
      BASE_CHAIN
    );

    const txHash = await sdk.fulfillOrder({
      order,
      accountAddress,
    });

    return typeof txHash === 'string' ? txHash : (txHash as any)?.hash || '';
  }, []);

  return {
    isLoadingNFTs,
    isLoadingOffers,
    error,
    fetchOwnedBasePaints,
    enrichWithMarketData,
    fetchTokenMarketData,
    createListing,
    fulfillOffer,
    fetchFloorListings,
    fulfillListing,
  };
}

// ─── Exported type for floor listings ────────────────────────────────────────
export interface FloorListing {
  orderHash: string;
  protocolAddress: string;
  tokenId: string;
  priceEth: number;
  imageUrl: string;
}
