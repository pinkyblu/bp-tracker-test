import { CanvasItem, DailyMint, SubscriptionPlan } from './types';

// The ERC-1155 NFT Contract (used for OpenSea, Holdings, Total Supply)
export const BASEPAINT_NFT_CONTRACT = "0xba5e05cb26b78eda3a2f8e3b3814726305dcac83";

// The Brush/Minter Contract (used for minting daily canvases)
export const BASEPAINT_BRUSH_CONTRACT = "0xaff1A9E200000061fC3283455d8B0C7e3e728161";

// NOTE: Provide a valid OpenSea API Key to fetch real data
export const OPENSEA_API_KEY = "7ba92f8492844f9795aa62ad437d98ea"; 

export const CURRENT_MINT: DailyMint = {
  day: 24,
  title: "Pepe",
  mintsCount: 73,
  timeLeft: "13:59:00",
  price: 0.0026,
  imageUrl: "https://basepaint.xyz/api/art/image?day=24"
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: '3day',
    duration: '3 days',
    rangeText: 'From 703 to 705',
    price: 0.0078
  },
  {
    id: '7day',
    duration: '7 days',
    rangeText: 'From 703 to 710',
    price: 0.0173
  },
  {
    id: '1month',
    duration: '1 month',
    rangeText: 'From 703 to 733',
    price: 0.0741
  }
];

export const PORTFOLIO_ITEMS: CanvasItem[] = [
  {
    id: '703',
    day: 703,
    imageUrl: "https://basepaint.xyz/api/art/image?day=703",
    lastSale: 0,
    bestOffer: 0,
    listPrice: 0.025,
    isListed: true
  },
  {
    id: '701',
    day: 701,
    imageUrl: "https://basepaint.xyz/api/art/image?day=701",
    lastSale: 0,
    bestOffer: 0,
    listPrice: 0.00725,
    isListed: true
  },
  {
    id: '699',
    day: 699,
    imageUrl: "https://basepaint.xyz/api/art/image?day=699",
    lastSale: 0,
    bestOffer: 0,
    listPrice: 0.0031,
    isListed: true
  },
  {
    id: '544',
    day: 544,
    imageUrl: "https://basepaint.xyz/api/art/image?day=544",
    lastSale: 0,
    bestOffer: 0,
    listPrice: 0.011,
    isListed: true
  },
  {
    id: '233',
    day: 233,
    imageUrl: "https://basepaint.xyz/api/art/image?day=233",
    lastSale: 0,
    bestOffer: 0,
    listPrice: 0.00103,
    isListed: true // Changed to listed per request
  }
];

export const FLOOR_PRICE = 0.003;