import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  showCancel?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel, // Defaults handled in component body if undefined, but good to pass from parent for i18n
  cancelLabel,
  isDestructive = false,
  showCancel = true,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-mystery-800 border border-mystery-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-mystery-200 mb-6 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          {showCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel} 
              className="text-mystery-300 hover:text-white hover:bg-mystery-700"
            >
              {cancelLabel || 'Cancel'}
            </Button>
          )}
          <Button 
            variant={isDestructive ? 'danger' : 'primary'} 
            onClick={onConfirm}
          >
            {confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};