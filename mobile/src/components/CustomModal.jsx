import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, AlertIcon, InformationCircleIcon } from './Icons';

// Modal context for programmatic usage
let showModalFn = null;

export function useModal() {
  return {
    alert: (message, options = {}) => showModalFn?.({ type: 'alert', message, ...options }),
    confirm: (message, options = {}) => showModalFn?.({ type: 'confirm', message, ...options }),
    success: (message, options = {}) => showModalFn?.({ type: 'success', message, ...options }),
    error: (message, options = {}) => showModalFn?.({ type: 'error', message, ...options }),
  };
}

export function ModalProvider({ children }) {
  const [modals, setModals] = useState([]);

  useEffect(() => {
    showModalFn = (config) => {
      return new Promise((resolve) => {
        const id = Date.now();
        setModals(prev => [...prev, { id, ...config, resolve }]);
      });
    };
    
    return () => {
      showModalFn = null;
    };
  }, []);

  function closeModal(id, result) {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.resolve) {
        modal.resolve(result);
      }
      return prev.filter(m => m.id !== id);
    });
  }

  return (
    <>
      {children}
      {modals.map(modal => (
        <Modal 
          key={modal.id} 
          {...modal} 
          onClose={(result) => closeModal(modal.id, result)} 
        />
      ))}
    </>
  );
}

function Modal({ id, type, message, title, confirmText, cancelText, onClose }) {
  const isConfirm = type === 'confirm';
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isAlert = type === 'alert';

  const defaultTitle = isSuccess ? 'Success' : isError ? 'Error' : isConfirm ? 'Confirm Action' : 'Notice';
  const bgColor = isSuccess ? 'bg-green-50' : isError ? 'bg-red-50' : 'bg-indigo-50';
  const iconColor = isSuccess ? 'text-green-600' : isError ? 'text-red-600' : 'text-indigo-600';
  const buttonColor = isSuccess 
    ? 'bg-green-600 hover:bg-green-700' 
    : isError 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Icon Header */}
        <div className={`${bgColor} px-6 pt-8 pb-4 rounded-t-2xl text-center`}>
          <div className={`w-16 h-16 mx-auto ${bgColor} rounded-full flex items-center justify-center mb-4`}>
            {isSuccess && <CheckCircleIcon className={`w-10 h-10 ${iconColor}`} filled />}
            {isError && <AlertIcon className={`w-10 h-10 ${iconColor}`} />}
            {isConfirm && <AlertIcon className={`w-10 h-10 ${iconColor}`} />}
            {isAlert && <InformationCircleIcon className={`w-10 h-10 ${iconColor}`} />}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {title || defaultTitle}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-700 text-center whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {isConfirm && (
            <>
              <button
                onClick={() => onClose(false)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold transition"
              >
                {cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => onClose(true)}
                className={`flex-1 px-4 py-3 rounded-xl ${buttonColor} text-white font-semibold transition shadow-lg`}
              >
                {confirmText || 'Confirm'}
              </button>
            </>
          )}
          {!isConfirm && (
            <button
              onClick={() => onClose(true)}
              className={`w-full px-4 py-3 rounded-xl ${buttonColor} text-white font-semibold transition shadow-lg`}
            >
              {confirmText || 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Legacy window.alert / window.confirm replacements
export function installModalOverrides() {
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;

  window.alert = function(message) {
    if (showModalFn) {
      return showModalFn({ type: 'alert', message });
    }
    return originalAlert(message);
  };

  window.confirm = function(message) {
    if (showModalFn) {
      return showModalFn({ type: 'confirm', message });
    }
    return originalConfirm(message);
  };

  return () => {
    window.alert = originalAlert;
    window.confirm = originalConfirm;
  };
}
