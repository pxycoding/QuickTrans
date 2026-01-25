import React, { useEffect, useState } from 'react';
import { CheckIcon, XIcon, InfoIcon, LoadingIcon } from './Icons';
import './Toast.css';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'loading';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 2000,
  onClose
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === 'loading') return;

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, type, onClose]);

  if (!visible) return null;

  const renderIcon = () => {
    const iconProps = { size: 16, className: 'qa-toast-icon' };
    switch (type) {
      case 'success':
        return <CheckIcon {...iconProps} color="#27ae60" />;
      case 'error':
        return <XIcon {...iconProps} color="#e74c3c" />;
      case 'info':
        return <InfoIcon {...iconProps} color="#3498db" />;
      case 'loading':
        return <LoadingIcon {...iconProps} color="#3498db" />;
      default:
        return null;
    }
  };

  return (
    <div className={`qa-toast qa-toast--${type}`}>
      {renderIcon()}
      <span className="qa-toast-message">{message}</span>
    </div>
  );
};

