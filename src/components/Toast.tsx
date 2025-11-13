'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 5000 }: ToastProps) {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-100/50',
                    border: 'border-green-600',
                    textColor: 'text-green-700'
                };
            case 'error':
                return {
                    bg: 'bg-red-100/50',
                    border: 'border-red-600',
                    textColor: 'text-red-700'
                };
            case 'warning':
                return {
                    bg: 'bg-orange-100/50',
                    border: 'border-orange-600',
                    textColor: 'text-orange-700'
                };
            case 'info':
                return {
                    bg: 'bg-blue-100/50',
                    border: 'border-blue-600',
                    textColor: 'text-blue-700'
                };
        }
    };

    const styles = getToastStyles();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="fixed top-6 right-6 z-[9999] max-w-md"
                >
                    <div className={`${styles.bg} ${styles.border} border-2 rounded-lg backdrop-blur-sm px-4 py-3 font-roboto`}>
                        <p className={`text-sm font-medium ${styles.textColor}`}>
                            {message}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Hook pour utiliser facilement les toasts
export function useToast() {
    const [toast, setToast] = useState<{
        message: string;
        type: ToastType;
        isVisible: boolean;
    }>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const ToastComponent = () => (
        <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={hideToast}
        />
    );

    return { showToast, ToastComponent };
}

