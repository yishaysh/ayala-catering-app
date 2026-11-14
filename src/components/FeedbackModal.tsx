import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useStore } from '../store';
import { AccessibleModal } from './AccessibleModal';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: FeedbackType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText,
  cancelText,
  isConfirm = false,
}) => {
  const { language } = useStore();
  const isHe = language === 'he';

  const resolvedConfirm = confirmText || (isHe ? 'אישור' : 'Confirm');
  const resolvedCancel = cancelText || (isHe ? 'ביטול' : 'Cancel');

  const iconMap = {
    success: <CheckCircle2 className="text-emerald-700" size={32} />,
    error: <AlertCircle className="text-red-700" size={32} />,
    warning: <AlertCircle className="text-amber-700" size={32} />,
    info: <Info className="text-themePrimary" size={32} />,
  };

  const buttonStyles = {
    success: 'bg-green-700 hover:bg-green-800 text-white',
    error: 'bg-red-700 hover:bg-red-800 text-white',
    warning: 'bg-themeHeaderBg text-themeHeaderTxt hover:opacity-95',
    info: 'bg-themeHeaderBg text-themeHeaderTxt hover:opacity-95',
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      titleId="feedback-modal-title"
      ariaLabel={title}
      closeLabel={isHe ? 'סגור' : 'Close'}
      dir={isHe ? 'rtl' : 'ltr'}
      overlayClassName="bg-black/65 backdrop-blur-sm p-4 z-[1100]"
      contentClassName="relative bg-themeCardBg text-themeText w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-themeText/15 flex flex-col items-center text-center"
    >
      <div className="mb-4 bg-themeBg p-3 rounded-full border border-themeText/10">
        {iconMap[type]}
      </div>

      <h3 id="feedback-modal-title" className="text-xl font-serif font-bold text-themeText mb-2">
        {title}
      </h3>
      <p className="text-themeText/80 text-sm mb-6 leading-relaxed px-2 whitespace-pre-line">
        {message}
      </p>

      <div className="flex gap-3 w-full">
        {isConfirm && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold bg-themeBg text-themeText border border-themeText/20 hover:bg-themeText/5 transition-colors"
          >
            {resolvedCancel}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (onConfirm) onConfirm();
            else onClose();
          }}
          className={`flex-1 py-3 rounded-xl font-bold transition shadow-md active:scale-95 ${buttonStyles[type]}`}
        >
          {resolvedConfirm}
        </button>
      </div>
    </AccessibleModal>
  );
};
