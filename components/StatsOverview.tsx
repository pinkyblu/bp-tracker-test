
import React, { useMemo } from 'react';
import { CanvasItem } from '../types';
import { Loader2 } from 'lucide-react';

interface StatsOverviewProps {
  items?: CanvasItem[];
  collectionStats?: {
    thirty_day_change: number;
    floor_price: number;
  };
  isLoading?: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ items = [], collectionStats, isLoading = false }) => {
  
  // Use collection stats or default to 0
  const thirtyDayChange = collectionStats?.thirty_day_change || 0;

  const stats = useMemo(() => {
    // 1. Calculate Portfolio Value (Sum of all list prices)
    const totalListValue = items.reduce((acc, item) => {
       return acc + (item.listPrice || 0);
    }, 0);

    // 2. Calculate Owned Count & Cost Basis
    const count = items.length;
    
    // NEW: Calculate cost basis based on purchase price (lastSale) or fallback to mint price
    const totalCostBasis = items.reduce((acc, item) => {
      // Use lastSale (purchase price) if available (>0), otherwise fallback to mint price (0.0026)
      const itemCost = item.lastSale > 0 ? item.lastSale : 0.0026;
      return acc + itemCost;
    }, 0);

    // 3. Calculate Sum of Best Offers
    const totalOfferValue = items.reduce((acc, item) => acc + (item.bestOffer || 0), 0);
    
    // 4. Calculate Two PnLs
    // PnL 1: List Price Sum - Cost Basis
    // FIX: If totalListValue is 0 (no listings), show 0 PnL instead of negative cost basis
    const pnlListRaw = totalListValue > 0 ? totalListValue - totalCostBasis : 0;
    
    // PnL 2: Best Offer Sum - Cost Basis
    // FIX: If totalOfferValue is 0 (no offers), show 0 PnL instead of negative cost basis
    const pnlOfferRaw = totalOfferValue > 0 ? totalOfferValue - totalCostBasis : 0;
    
    // Formatters
    const formatPnL = (val: number) => (val > 0 ? "+" : "") + val.toFixed(4) + " Ξ";

    // Percent Change (for chart visualization proxy)
    const percentChange = thirtyDayChange * 100;
    const percentString = (percentChange > 0 ? "+" : "") + percentChange.toFixed(2) + "%";
    const isNegative = thirtyDayChange < 0;

    return {
      totalValue: totalListValue.toFixed(4),
      
      pnlListValue: formatPnL(pnlListRaw),
      pnlListIsNegative: pnlListRaw < 0,
      
      pnlOfferValue: formatPnL(pnlOfferRaw),
      pnlOfferIsNegative: pnlOfferRaw < 0,

      count,
      portfolioPercent: percentString,
      portfolioIsNegative: isNegative
    };
  }, [items, thirtyDayChange]);

  // Generate 30 data points representing the last 30 days history leading up to Current Value
  const generateTrendData = (currentVal: number, change: number, points: number = 30) => {
      // If current value is 0, chart is flat 0
      if (currentVal === 0) return new Array(points).fill(0);

      // Start value = Current / (1 + change_decimal)
      const startVal = currentVal / (1 + change);
      const data = [startVal];
      let val = startVal;
      const step = (currentVal - startVal) / points;
      
      for(let i = 1; i < points; i++) {
          const noise = (Math.random() - 0.5) * (Math.abs(step) * 5 || (currentVal * 0.01));
          val += step + noise;
          data.push(val);
      }
      data.push(currentVal); 
      return data;
  };

  // Generate path strings from data
  const generatePath = (data: number[], width: number, height: number, isClosed: boolean) => {
      const max = Math.max(...data) * 1.1 || 1;
      const min = Math.min(...data) * 0.9 || 0;
      const range = max - min;
      
      const points = data.map((val, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - ((val - min) / range) * height;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      let d = `M${points[0]}`;
      for(let i=1; i<points.length; i++) {
          d += ` L${points[i]}`;
      }

      if (isClosed) {
          d += ` L${width},${height} L0,${height} Z`;
      }

      return d;
  };

  const portfolioTrendData = useMemo(() => {
    return generateTrendData(parseFloat(stats.totalValue), thirtyDayChange);
  }, [stats.totalValue, thirtyDayChange]);

  const pnlTrendData = useMemo(() => {
    // Use List PnL for the chart shape logic
    // We strip the "+" or " Ξ" to parse float
    const rawPnL = parseFloat(stats.pnlListValue.replace(/[+Ξ]/g, ''));
    return generateTrendData(rawPnL, thirtyDayChange);
  }, [stats.pnlListValue, thirtyDayChange]);

  const portfolioPaths = {
      area: generatePath(portfolioTrendData, 100, 50, true),
      stroke: generatePath(portfolioTrendData, 100, 50, false)
  };

  const pnlPaths = {
      area: generatePath(pnlTrendData, 100, 50, true),
      stroke: generatePath(pnlTrendData, 100, 50, false)
  };

  // Bar Data for "Owned"
  const barData = useMemo(() => {
    if (items.length === 0) return [0, 0, 0, 0, 0];
    const values = items.map(item => item.listPrice || item.bestOffer || 0);
    const displayValues = values.slice(0, 5);
    const max = Math.max(...displayValues, 0.0001);
    const bars = displayValues.map(v => (v / max) * 100);
    while (bars.length < 5) bars.push(0);
    return bars;
  }, [items]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800 h-36 flex flex-col justify-center items-center animate-pulse">
            <Loader2 className="animate-spin text-gray-300 dark:text-gray-700 mb-2" size={24} />
            <div className="h-2 w-16 bg-gray-200 dark:bg-gray-800 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Portfolio Value Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col relative overflow-hidden h-36 transition-colors">
        <div className="z-10 flex flex-col h-full justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Portfolio</div>
            <div className="flex flex-col mt-1">
              <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.totalValue} Ξ</div>
              <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${stats.portfolioIsNegative ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                <span>{stats.portfolioPercent}</span>
                <span className="text-[9px] opacity-70 font-medium text-gray-400 dark:text-gray-500">(30d)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-50">
          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={stats.portfolioIsNegative ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"} stopColor="currentColor" stopOpacity="0.2"/>
                <stop offset="100%" className={stats.portfolioIsNegative ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"} stopColor="currentColor" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={portfolioPaths.area} fill="url(#portfolioGradient)" />
            <path d={portfolioPaths.stroke} fill="none" className={stats.portfolioIsNegative ? "stroke-red-600 dark:stroke-red-500" : "stroke-green-600 dark:stroke-green-500"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {/* PnL Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col relative overflow-hidden h-36 transition-colors">
        <div className="z-10 flex flex-col h-full justify-start">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-tight mb-2">Unrealized PnL</div>
          
          <div className="flex flex-col gap-1.5">
               {/* PnL based on List Price */}
               <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">vs List Price</span>
                  <div className={`text-sm font-bold leading-none ${
                     stats.pnlListIsNegative ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'
                  }`}>
                     {stats.pnlListValue}
                  </div>
               </div>

               {/* PnL based on Best Offer */}
               <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">vs Best Offer</span>
                  <div className={`text-sm font-bold leading-none ${
                     stats.pnlOfferIsNegative ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'
                  }`}>
                     {stats.pnlOfferValue}
                  </div>
               </div>
          </div>
        </div>

        {/* Simplified Background Chart */}
        <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
           <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
             <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={stats.pnlListIsNegative ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"} stopColor="currentColor" stopOpacity="0.2"/>
                <stop offset="100%" className={stats.pnlListIsNegative ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"} stopColor="currentColor" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={pnlPaths.area} fill="url(#pnlGradient)" />
          </svg>
        </div>
      </div>
      
      {/* Owned Count Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col relative overflow-hidden h-36 transition-colors">
        <div className="z-10 flex flex-col h-full justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owned</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white leading-none mt-1">{stats.count}</div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 px-1 flex items-end">
          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            {barData.map((heightPercent, i) => {
              const x = 8 + (i * 18);
              const h = (heightPercent / 100) * 45;
              const y = 50 - h;
              if (h <= 0) return null;
              return (
                <rect 
                  key={i}
                  x={x} 
                  y={y} 
                  width="12" 
                  height={h} 
                  rx="2" 
                  className={i === 0 ? "fill-gray-900 dark:fill-white" : "fill-gray-300 dark:fill-gray-600"} 
                />
              );
            })}
            {items.length === 0 && (
               <line x1="0" y1="48" x2="100" y2="48" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" strokeDasharray="4 2" />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
