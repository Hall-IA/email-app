'use client';

import { X, TriangleAlert } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Oui',
  cancelText = 'Non',
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <p className="mb-6 text-gray-700">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-sm bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-sm bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

