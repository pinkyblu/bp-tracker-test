export interface CanvasItem {
  id: string;
  day: number;
  imageUrl: string;
  lastSale: number;
  listPrice?: number;
  bestOffer: number;
  isListed?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  duration: string;
  rangeText: string;
  price: number;
}

export interface PortfolioStats {
  totalValue: number;
  pnl: number; // Percentage or absolute value
  count: number;
}

export interface DailyMint {
  day: number;
  title: string;
  mintsCount: number;
  timeLeft: string; // simpler for mock than real countdown
  price: number;
  imageUrl: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}