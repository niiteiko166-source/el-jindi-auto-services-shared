import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white';
        let Icon = CheckCircle2;

        if (toast.type === 'error') {
          bg = 'bg-red-600 text-white';
          Icon = AlertCircle;
        } else if (toast.type === 'info') {
          bg = 'bg-blue-600 text-white';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold ${bg} animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto max-w-sm`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
