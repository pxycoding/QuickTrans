import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, MinimizeIcon, MaximizeIcon, EditIcon } from './Icons';
import { useI18n } from '../i18n/useI18n';
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
  onNameSave?: (name: string) => void;
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
  // 以下属性用于跨tab同步
  windowId,
  windowName: _windowName,
  isEditingName: _isEditingName,
  onNameInput: _onNameInput,
  onNameSave: _onNameSave,
  onNameCancel: _onNameCancel,
  onHeaderDoubleClick: _onHeaderDoubleClick
}) => {
  const { locale } = useI18n();
  
  // 计算居中位置
  const calculateCenterPosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const estimatedWidth = minWidth;
    const estimatedHeight = minHeight;
    return {
      x: (windowWidth - estimatedWidth) / 2,
      y: (windowHeight - estimatedHeight) / 2
    };
  };

  const centerPosition = calculateCenterPosition();
  const defaultPosition = initialPosition || centerPosition;

  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [size, setSize] = useState({ width: minWidth, height: minHeight });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'bottom-left' | 'bottom-right' | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [localTitle, setLocalTitle] = useState<string | null>(null); // 本地保存的标题（当没有外部回调时）
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 加载保存的位置和大小（基于窗口ID）
  useEffect(() => {
    if (windowId) {
      const positionKey = `floatWindowPosition_${windowId}`;
      const sizeKey = `floatWindowSize_${windowId}`;
      chrome.storage.local.get([positionKey, sizeKey], (result) => {
        if (result[positionKey]) {
          setPosition(result[positionKey]);
        } else {
          // 如果没有保存的位置，使用居中位置
          const center = calculateCenterPosition();
          setPosition(center);
        }
        if (result[sizeKey]) {
          setSize(result[sizeKey]);
        } else {
          setSize({ width: minWidth, height: minHeight });
        }
      });
    } else {
      // 如果没有窗口ID，使用居中位置和默认大小
      const center = calculateCenterPosition();
      setPosition(center);
      setSize({ width: minWidth, height: minHeight });
    }
  }, [windowId, minWidth, minHeight]);

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

  // 开始编辑名称
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 优先使用本地保存的标题，然后是外部传入的 windowName，最后是 title
    const currentName = localTitle || _windowName || (typeof title === 'string' ? title : '');
    setEditingName(currentName);
    setIsEditingName(true);
    // 使用外部传入的编辑状态（如果存在）
    if (_onNameInput) {
      _onNameInput(currentName);
    }
  };

  // 保存名称（失焦或按 Enter 时调用，将当前 editingName 传给父组件保存）
  const handleSaveName = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (_onNameSave && _onNameInput) {
      // 如果有外部回调，传入当前编辑中的名称，避免依赖父组件异步 state 更新
      _onNameInput(editingName);
      _onNameSave(editingName);
    } else {
      // 如果没有外部回调，使用本地状态保存
      setLocalTitle(editingName);
    }
    setIsEditingName(false);
  };

  // 取消编辑
  const handleCancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (_onNameCancel) {
      _onNameCancel();
    }
    setIsEditingName(false);
    setEditingName('');
  };

  // 计算字符长度（中文算2，英文算1）
  const getCharLength = (str: string): number => {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      // 判断是否为中文字符
      if (/[\u4e00-\u9fa5]/.test(char)) {
        length += 2;
      } else {
        length += 1;
      }
    }
    return length;
  };

  // 处理输入框内容变化（仅更新本地状态，不通知父组件，避免父组件重渲染导致 input 失焦并触发 onBlur 保存）
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // 检查长度限制（最大20个长度单位，即10个中文或20个英文）
    if (getCharLength(newValue) <= 20) {
      setEditingName(newValue);
    }
  };

  // 处理输入框按键事件
  const handleNameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  // 当外部编辑状态变化时同步
  useEffect(() => {
    if (_isEditingName !== undefined) {
      setIsEditingName(_isEditingName);
      if (_isEditingName && _windowName) {
        setEditingName(_windowName);
      }
    }
  }, [_isEditingName, _windowName]);

  // 当外部 windowName 变化时，如果不在编辑状态，更新显示
  useEffect(() => {
    if (!isEditingName && _windowName) {
      // 如果外部提供了 windowName，优先使用它
      // 但只有在没有本地保存的标题时才更新
      if (!localTitle) {
        // 这里不需要更新 localTitle，因为外部会通过 windowName 控制
      }
    }
  }, [_windowName, isEditingName, localTitle]);

  // 当进入编辑模式时，聚焦输入框
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

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

  // 拖拽中（边界按当前实际尺寸计算：最小化时 240x280，展开时用 size）
  const effectiveWidth = isMinimized ? 240 : size.width;
  const effectiveHeight = isMinimized ? 280 : size.height;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - effectiveWidth));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - effectiveHeight));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // 保存位置到 storage（基于窗口ID）
      if (windowId) {
        const positionKey = `floatWindowPosition_${windowId}`;
        chrome.storage.local.set({
          [positionKey]: position
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, effectiveWidth, effectiveHeight, windowId]);

  // 调整大小开始
  const handleResizeStart = (e: React.MouseEvent, handle: 'bottom-left' | 'bottom-right') => {
    e.stopPropagation();
    if (!windowRef.current) return;

    const rect = windowRef.current.getBoundingClientRect();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      startX: position.x,
      startY: position.y
    });
  };

  // 调整大小中
  useEffect(() => {
    if (!isResizing || !resizeHandle) return;

    const latestStateRef = { size: { ...size }, position: { ...position } };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.startX || position.x;
      const newY = resizeStart.startY || position.y;

      if (resizeHandle === 'bottom-right') {
        // 右下角：只改变宽度和高度
        newWidth = Math.max(minWidth, resizeStart.width + deltaX);
        newHeight = Math.max(minHeight, resizeStart.height + deltaY);
      } else if (resizeHandle === 'bottom-left') {
        // 左下角：改变宽度（同时调整x位置）和高度
        const widthDelta = resizeStart.width - deltaX;
        if (widthDelta >= minWidth) {
          newWidth = widthDelta;
          newX = resizeStart.startX + deltaX;
        } else {
          newWidth = minWidth;
          newX = resizeStart.startX + (resizeStart.width - minWidth);
        }
        newHeight = Math.max(minHeight, resizeStart.height + deltaY);
      }

      // 确保窗口不会超出屏幕边界
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX;
      }
      if (newX < 0) {
        newWidth = newWidth + newX;
        newX = 0;
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY;
      }

      latestStateRef.size = { width: newWidth, height: newHeight };
      latestStateRef.position = { x: newX, y: newY };

      setSize(latestStateRef.size);
      if (resizeHandle === 'bottom-left') {
        setPosition(latestStateRef.position);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      // 保存大小和位置到 storage（基于窗口ID）
      if (windowId) {
        const sizeKey = `floatWindowSize_${windowId}`;
        const positionKey = `floatWindowPosition_${windowId}`;
        chrome.storage.local.set({
          [sizeKey]: latestStateRef.size,
          [positionKey]: latestStateRef.position
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, resizeStart, position, minWidth, minHeight, windowId, size]);

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
      className={`qa-booster-float lang-${locale} ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: isMinimized ? '240px' : `${minWidth}px`,
        minHeight: isMinimized ? '280px' : `${minHeight}px`,
        width: isMinimized ? '240px' : `${size.width}px`,
        height: isMinimized ? '280px' : `${size.height}px`
      }}
    >
      <div
        ref={headerRef}
        className="qa-booster-header"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className="qa-booster-title-wrapper">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              className="qa-booster-title-input"
              value={editingName}
              onChange={handleNameInputChange}
              onKeyDown={handleNameInputKeyDown}
              onBlur={() => handleSaveName()}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="qa-booster-title">
                {localTitle || _windowName || (typeof title === 'string' ? title : null) || title}
              </div>
              <button
                className="qa-booster-btn-edit"
                onClick={handleStartEdit}
                title="编辑名称"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <EditIcon size={12} />
              </button>
            </>
          )}
        </div>
        <div className="qa-booster-controls">
          {onMinimize && (
            <button
              className="qa-booster-btn-minimize"
              onClick={toggleMinimize}
              title={isMinimized ? '展开' : '最小化'}
            >
              {isMinimized ? <MaximizeIcon size={14} /> : <MinimizeIcon size={14} />}
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
        <>
          <div className="qa-booster-content">
            {children}
          </div>
          {/* 调整大小手柄 */}
          <div
            className="qa-booster-resize-handle qa-booster-resize-handle-bottom-left"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
            style={{ cursor: 'nwse-resize' }}
          />
          <div
            className="qa-booster-resize-handle qa-booster-resize-handle-bottom-right"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
            style={{ cursor: 'nwse-resize' }}
          />
        </>
      )}
    </div>,
    container
  );
};

