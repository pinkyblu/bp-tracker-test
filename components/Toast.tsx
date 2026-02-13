import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-[#2D2D2D] dark:bg-black text-white px-4 py-3.5 rounded-xl shadow-xl flex items-center gap-3 animate-bounce-in border border-white/10 dark:border-gray-800">
        {type === 'success' ? (
          <CheckCircle2 size={20} className="text-green-400 shrink-0" />
        ) : (
          <AlertCircle size={20} className="text-red-400 shrink-0" />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

export default Toast;