
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
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>
            <div className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-zoom-in text-start transform transition-all">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 bg-stone-100 p-1.5 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-gold-100 text-gold-600'}`}>
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">
                        {title}
                    </h3>
                    
                    <p className="text-stone-500 mb-8 text-sm leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-lg hover:bg-stone-200 transition-colors"
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
                                    : 'bg-gold-500 hover:bg-gold-600 text-stone-900 shadow-gold-200'
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
