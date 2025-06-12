import { useContext } from 'react';
import { ToastContext, Toast } from '../hooks/useToast';

function ToastIcon({ type, customIcon }: { type: Toast['type']; customIcon?: React.ReactNode }) {
  if (customIcon) return <>{customIcon}</>;

  const iconClasses = "w-4 h-4 text-green-400";
  
  switch (type) {
    case 'mission':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'augmentation':
      return <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />;
    case 'achievement':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
        </svg>
      );
    case 'success':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />;
  }
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getBorderColor = (type: Toast['type']) => {
    switch (type) {
      case 'error': return 'border-red-400/30 hover:border-red-400/60';
      case 'warning': return 'border-yellow-400/30 hover:border-yellow-400/60';
      case 'info': return 'border-blue-400/30 hover:border-blue-400/60';
      default: return 'border-green-400/30 hover:border-green-400/60';
    }
  };

  const getGlowColor = (type: Toast['type']) => {
    switch (type) {
      case 'error': return 'shadow-[0_0_20px_rgba(239,68,68,0.1)]';
      case 'warning': return 'shadow-[0_0_20px_rgba(251,191,36,0.1)]';
      case 'info': return 'shadow-[0_0_20px_rgba(59,130,246,0.1)]';
      default: return 'shadow-[0_0_20px_rgba(34,197,94,0.1)]';
    }
  };

  const getAccentColor = (type: Toast['type']) => {
    switch (type) {
      case 'error': return 'from-transparent via-red-400 to-transparent';
      case 'warning': return 'from-transparent via-yellow-400 to-transparent';
      case 'info': return 'from-transparent via-blue-400 to-transparent';
      default: return 'from-transparent via-green-400 to-transparent';
    }
  };

  return (
    <div className={`relative bg-black/80 border ${getBorderColor(toast.type)} rounded-lg p-4 ${getGlowColor(toast.type)} backdrop-blur-sm transition-all duration-300 animate-slide-in-right`}>
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getAccentColor(toast.type)}`} />
      
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
            <ToastIcon type={toast.type} customIcon={toast.icon} />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-green-400 font-bold text-sm mb-1 leading-tight">{toast.title}</h3>
          <p className="text-gray-300 text-sm leading-snug">{toast.message}</p>
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-500 hover:text-green-400 transition-colors duration-200 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('ToastContainer must be used within a ToastProvider');
  }

  const { toasts, removeToast } = context;

  if (toasts.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
} 