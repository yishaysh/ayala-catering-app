
import { useEffect, useRef } from 'react';

/**
 * Hook to intercept the browser back button when a modal is open.
 * When isOpen becomes true, it pushes a state to history.
 * When back button is pressed, it closes the modal instead of navigating back.
 * If modal is closed via UI, it cleans up the history stack.
 */
export const useBackButton = (isOpen: boolean, onClose: () => void) => {
    // Use a ref for the callback to prevent effect re-runs if the function reference changes
    const onCloseRef = useRef(onClose);
    
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        // Push a state to the history stack to "trap" the back button
        const stateId = Math.random().toString(36).substring(7);
        window.history.pushState({ modalOpen: stateId }, '', window.location.href);

        const handlePopState = (event: PopStateEvent) => {
            // The back button was pressed
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            
            // If we are cleaning up because the component unmounted or isOpen became false
            // (i.e., closed via UI "X" button), we need to revert the history push
            // so the user doesn't have to press back twice later.
            // We check if the current state is the one we pushed.
            if (window.history.state?.modalOpen === stateId) {
                window.history.back();
            }
        };
    }, [isOpen]);
};
