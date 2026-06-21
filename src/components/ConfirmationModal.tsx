
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>
            <div className="relative bg-themeCardBg text-themeText border border-themeText/10 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-zoom-in text-start transform transition-all">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-themeText/60 hover:text-themeText bg-themeBg/50 hover:bg-themeBg p-1.5 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${isDestructive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-themePrimary/10 text-themePrimary border border-themePrimary/20'}`}>
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h3 className="text-xl font-serif font-bold text-themeText mb-2">
                        {title}
                    </h3>
                    
                    <p className="text-themeText/65 mb-8 text-sm leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-themeBg text-themeText/70 border border-themeText/10 font-bold rounded-lg hover:opacity-90 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2.5 font-bold rounded-lg text-white shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                                isDestructive 
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                                    : 'bg-themePrimary text-themeHeaderBg hover:opacity-90'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
