import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, MinimizeIcon } from './Icons';
import './FloatWindow.css';

export interface FloatWindowProps {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  initialPosition?: { x: number; y: number };
  minWidth?: number;
  minHeight?: number;
  draggable?: boolean;
  minimized?: boolean;
  minimizedContent?: React.ReactNode;
  // 以下属性用于跨tab同步，但 FloatWindow 组件本身不使用
  windowId?: string;
  windowName?: string;
  isEditingName?: boolean;
  onNameInput?: (value: string) => void;
  onNameSave?: () => void;
  onNameCancel?: () => void;
  onHeaderDoubleClick?: () => void;
}

export const FloatWindow: React.FC<FloatWindowProps> = ({
  title,
  children,
  onClose,
  onMinimize,
  onExpand,
  initialPosition,
  minWidth = 360,
  minHeight = 200,
  draggable = true,
  minimized = false,
  minimizedContent,
  // 以下属性被忽略，仅用于类型兼容
  windowId: _windowId,
  windowName: _windowName,
  isEditingName: _isEditingName,
  onNameInput: _onNameInput,
  onNameSave: _onNameSave,
  onNameCancel: _onNameCancel,
  onHeaderDoubleClick: _onHeaderDoubleClick
}) => {
  const defaultPosition = initialPosition || {
    x: window.innerWidth - 400,
    y: 100
  };

  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(minimized);
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 加载保存的位置
  useEffect(() => {
    chrome.storage.local.get(['floatWindowPosition'], (result) => {
      if (result.floatWindowPosition) {
        setPosition(result.floatWindowPosition);
      }
    });
  }, []);

  // 切换最小化状态
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      onMinimize?.();
    } else {
      onExpand?.();
    }
  };

  // 处理双击事件
  const handleDoubleClick = () => {
    toggleMinimize();
  };

  // 拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;

    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // 拖拽中
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - minWidth));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - minHeight));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // 保存位置到 storage
      chrome.storage.local.set({
        floatWindowPosition: position
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, minWidth, minHeight]);

  // 创建容器
  const container = document.getElementById('qa-booster-root') || (() => {
    const div = document.createElement('div');
    div.id = 'qa-booster-root';
    document.body.appendChild(div);
    return div;
  })();

  return createPortal(
    <div
      ref={windowRef}
      className={`qa-booster-float ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: isMinimized ? '200px' : `${minWidth}px`,
        minHeight: isMinimized ? '100px' : `${minHeight}px`,
        width: isMinimized ? '200px' : 'auto'
      }}
    >
      <div
        ref={headerRef}
        className="qa-booster-header"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <span className="qa-booster-title">{title}</span>
        <div className="qa-booster-controls">
          {onMinimize && (
            <button
              className="qa-booster-btn-minimize"
              onClick={toggleMinimize}
              title={isMinimized ? '展开' : '最小化'}
            >
              <MinimizeIcon size={14} />
            </button>
          )}
          <button
            className="qa-booster-btn-close"
            onClick={onClose}
            title="关闭"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
      {isMinimized ? (
        <div className="qa-booster-minimized-content">
          {minimizedContent || title}
        </div>
      ) : (
        <div className="qa-booster-content">
          {children}
        </div>
      )}
    </div>,
    container
  );
};

