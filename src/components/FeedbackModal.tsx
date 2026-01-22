
import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

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
    isConfirm?: boolean; // If true, shows two buttons (Confirm/Cancel). If false, shows only "OK" (Alert)
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmText = 'אישור',
    cancelText = 'ביטול',
    isConfirm = false
}) => {
    if (!isOpen) return null;

    // Icon Mapping
    const iconMap = {
        success: <CheckCircle2 className="text-green-500" size={32} />,
        error: <AlertCircle className="text-red-500" size={32} />,
        warning: <AlertCircle className="text-gold-500" size={32} />,
        info: <Info className="text-stone-500" size={32} />
    };

    // Color Styles for Primary Button
    const buttonStyles = {
        success: 'bg-green-600 hover:bg-green-700 text-white',
        error: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-gold-500 hover:bg-gold-600 text-stone-900',
        info: 'bg-stone-900 hover:bg-stone-800 text-white'
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 font-sans" dir="rtl">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Card */}
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-stone-100 animate-zoom-in flex flex-col items-center text-center">
                
                <button 
                    onClick={onClose} 
                    className="absolute top-4 left-4 text-stone-400 hover:text-stone-900 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-4 bg-stone-50 p-3 rounded-full border border-stone-100">
                    {iconMap[type]}
                </div>

                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">{title}</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed px-4">
                    {message}
                </p>

                <div className="flex gap-3 w-full">
                    {isConfirm && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            else onClose();
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${buttonStyles[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
