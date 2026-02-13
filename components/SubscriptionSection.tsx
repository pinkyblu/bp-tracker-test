import React from 'react';
import { SUBSCRIPTION_PLANS } from '../constants';

interface SubscriptionSectionProps {
  onShowToast: (msg: string) => void;
  id?: string;
  className?: string;
}

const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ 
  onShowToast, 
  id = "subscription-section", 
  className = "mb-6 scroll-mt-6"
}) => {
  const handleSubscribe = (plan: string) => {
    onShowToast(`Subscribed to ${plan} plan successfully!`);
  };

  return (
    <div id={id} className={className}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
        Suscribe and get 3% off
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-between min-h-[120px] transition-colors"
          >
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">
                {plan.duration}
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                {plan.rangeText}
              </p>
            </div>
            
            <button 
              onClick={() => handleSubscribe(plan.duration)}
              className="w-full mt-3 bg-[#2D2D2D] dark:bg-black text-white text-[10px] font-medium py-2 rounded-lg hover:bg-black dark:hover:bg-gray-900 transition-colors"
            >
              {plan.price} eth
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSection;