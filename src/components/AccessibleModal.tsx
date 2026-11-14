// Shared accessible portaled modal dialog with focus trap, Escape/backdrop close, and focus restoration.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  ariaLabel?: string;
  closeLabel?: string;
  dir?: 'rtl' | 'ltr';
  overlayClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), video[controls]';

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  titleId,
  ariaLabel,
  closeLabel = 'Close',
  dir = 'rtl',
  overlayClassName = 'bg-black/70 backdrop-blur-sm p-4',
  contentClassName = 'bg-themeCardBg rounded-2xl max-w-lg w-full shadow-2xl border border-themeText/15 relative',
  children,
  showCloseButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useBackButton(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const root = containerRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        root.focus();
      }
    };
    const timer = window.setTimeout(focusFirst, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const root = containerRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !root.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !root.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center ${overlayClassName}`}
      dir={dir}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={!titleId ? ariaLabel : undefined}
        tabIndex={-1}
        className={contentClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute top-3 end-3 z-20 p-2 rounded-full bg-themeCardBg/90 text-themeText hover:bg-themeText/10 border border-themeText/15 shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
