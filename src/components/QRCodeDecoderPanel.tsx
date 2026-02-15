import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FloatWindow } from './FloatWindow';
import { Button } from './Button';
import { ImageUpload } from './ImageUpload';
import { QRCodeDecoder } from '../converters/QRCodeDecoder';
import { QRCodeGenerator } from '../converters/QRCodeGenerator';
import { QRCodeOptions, QueryParamConfig } from '../types';
import { DecodeIcon, XIcon, RefreshIcon, DownloadIcon, LinkIcon, PlusIcon, GenerateIcon } from './Icons';
import { QueryParamConfigManager } from '../utils/QueryParamConfigManager';
import { useI18n } from '../i18n/useI18n';
import './QRCodeDecoderPanel.css';

interface QRCodeDecoderPanelProps {
  imageUrl?: string;
  imageFile?: File;
  url?: string;
  onClose: () => void;
  minimized?: boolean;
  windowId?: string; // 窗口唯一ID，用于跨tab同步
}

interface QueryParam {
  key: string;
  value: string;
}

interface QRCodeResult {
  success: boolean;
  type?: string;
  content?: string;
  error?: string;
}

export const QRCodeDecoderPanel: React.FC<QRCodeDecoderPanelProps> = ({
  imageUrl,
  imageFile,
  url: directUrl,
  onClose,
  minimized: initialMinimized = false,
  windowId
}) => {
  const { t } = useI18n();
  const [result, setResult] = useState<QRCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editedUrl, setEditedUrl] = useState('');
  const [initialUrl, setInitialUrl] = useState(''); // 保存初始链接用于复原
  const [currentQRCode, setCurrentQRCode] = useState(''); // 当前显示的二维码
  const [generating, setGenerating] = useState(false);
  const [params, setParams] = useState<QueryParam[]>([]); // URL参数列表
  const [selectedParams, setSelectedParams] = useState<string[]>([]); // 选中的参数
  const [validationError, setValidationError] = useState<string>(''); // 验证错误信息
  const [hasUrlEncoding, setHasUrlEncoding] = useState(false); // 是否包含URL编码
  const [decodedUrl, setDecodedUrl] = useState(''); // 解码后的URL
  const [configs, setConfigs] = useState<QueryParamConfig[]>([]); // 用户配置的常用参数
  const [selectedCommonParams, setSelectedCommonParams] = useState<{key: string; value: string}[]>([]); // 选中的常用参数
  const [isMinimized, setIsMinimized] = useState(initialMinimized); // 窗口最小化状态
  const [windowName, setWindowName] = useState<string>(''); // 窗口名称
  const [isEditingName, setIsEditingName] = useState(false); // 是否正在编辑名称
  // 如果有传入的图片，默认使用解码模式，否则使用生成模式
  const [mode, setMode] = useState<'decode' | 'generate'>(
    (imageUrl || imageFile) ? 'decode' : 'generate'
  );
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null); // 上传的图片文件
  
  // 使用useMemo包装options对象，避免依赖数组每次渲染都变化
  const options = useMemo<QRCodeOptions>(() => ({
    size: 256,
    errorCorrectionLevel: 'M'
  }), []);

  // 处理图片上传
  const handleImageUpload = useCallback((file: File) => {
    setUploadedImageFile(file);
    setMode('decode');
    // 触发解码
  }, []);

  React.useEffect(() => {
    const decode = async () => {
      // 优先使用上传的文件，然后是传入的 imageFile，最后是 imageUrl
      const fileToDecode = uploadedImageFile || imageFile;
      const urlToDecode = !fileToDecode ? imageUrl : undefined;

      if (!fileToDecode && !urlToDecode) return;

      setLoading(true);
      setError('');
      setResult(null);

      try {
        let decodeResult;
        if (fileToDecode) {
          // 创建预览URL
          const url = URL.createObjectURL(fileToDecode);
          setPreviewUrl(url);
          decodeResult = await QRCodeDecoder.decodeFromFile(fileToDecode);
        } else if (urlToDecode) {
          setPreviewUrl(urlToDecode);
          decodeResult = await QRCodeDecoder.decodeFromURL(urlToDecode);
        }

        if (decodeResult?.success) {
          setResult(decodeResult);
          
          // 保存窗口数据（基于窗口ID）
          if (windowId) {
            chrome.storage.local.set({
              [`qrCodeWindowData_${windowId}`]: {
                url: null,
                imageUrl: urlToDecode,
                imageFile: null // 文件对象无法直接存储
              }
            });
          }
        } else {
          setError(decodeResult?.error || t('qrcode.decodeFailed'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('qrcode.decodeFailed'));
      } finally {
        setLoading(false);
      }
    };

    decode();
  }, [uploadedImageFile, imageUrl, imageFile, windowId, t]);

  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 加载常用参数配置
  useEffect(() => {
    const loadConfigs = async () => {
      const loadedConfigs = await QueryParamConfigManager.getConfigs();
      setConfigs(loadedConfigs);
    };
    loadConfigs();
  }, []);

  // 加载窗口状态和名称（基于窗口ID）
  useEffect(() => {
    if (!windowId) return;

    const stateKey = `qrCodeWindowState_${windowId}`;
    const nameKey = `qrCodeWindowName_${windowId}`;
    
    // 加载保存的窗口状态和名称
    chrome.storage.local.get([stateKey, nameKey], (result) => {
      if (result[stateKey]) {
        setIsMinimized(result[stateKey].minimized || false);
      }
      if (result[nameKey]) {
        setWindowName(result[nameKey]);
      }
    });

    // 监听窗口状态变化（用于跨标签页同步）
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local') {
        if (changes[stateKey]) {
          const newState = changes[stateKey].newValue;
          if (newState) {
            setIsMinimized(newState.minimized || false);
          }
        }
        if (changes[nameKey]) {
          const newName = changes[nameKey].newValue;
          if (newName !== undefined) {
            setWindowName(newName);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [windowId]);

  // 解析URL参数 - 实现非用户常用参数的追加操作
  const parseUrlParams = useCallback((url: string) => {
    try {
      const urlObj = new URL(url);
      const newParams: QueryParam[] = [];
      const newParamKeys: string[] = [];
      
      // 获取所有常用参数的key集合
      const commonParamKeys = new Set(
        configs.flatMap(config => config.params).map(param => param.key)
      );
      
      // 解析URL中的参数
      urlObj.searchParams.forEach((value, key) => {
        newParams.push({ key, value });
        newParamKeys.push(key);
      });
      
      // 合并现有参数和新参数，避免重复
      setParams(prevParams => {
        const existingParamKeys = new Set(prevParams.map(param => param.key));
        const mergedParams = [...prevParams];
        
        // 只添加新的、非用户常用的参数
        newParams.forEach(param => {
          if (!existingParamKeys.has(param.key) && !commonParamKeys.has(param.key)) {
            mergedParams.push(param);
          }
        });
        
        return mergedParams;
      });
      
      // 更新选中的参数，保持现有选择状态并添加新的参数
      setSelectedParams(prevSelected => {
        const existingSelected = new Set(prevSelected);
        const updatedSelected = [...prevSelected];
        
        // 只添加新的、非用户常用的参数到选中状态
        newParams.forEach(param => {
          if (!existingSelected.has(param.key) && !commonParamKeys.has(param.key)) {
            updatedSelected.push(param.key);
          }
        });
        
        return updatedSelected;
      });
    } catch (error) {
      console.error('URL参数解析失败:', error);
      // 解析失败时不清空参数，保持现有状态
    }
  }, [configs]);

  // URL验证函数
  const validateUrl = useCallback((url: string) => {
    setValidationError('');
    setHasUrlEncoding(false);
    setDecodedUrl('');
    
    // 1. 检测纯空格输入
    if (!url.trim()) {
      setValidationError(''); // 空输入不显示错误，由其他逻辑处理
      return true;
    }
    
    if (url.trim() === url) {
      // 不是纯空格，但检查是否包含URL编码
      try {
        const decoded = decodeURIComponent(url);
        if (decoded !== url) {
          setHasUrlEncoding(true);
          setDecodedUrl(decoded);
        }
      } catch (e) {
        // 解码失败，可能包含不完整的URL编码
        setValidationError(t('qrcode.invalidUrlEncoding'));
        return false;
      }
    }
    
    // 2. 检测URL路径中的连续斜杠
    if (url.includes('//')) {
      // 排除协议部分的正常斜杠（如https://）
      const protocolEndIndex = url.indexOf('://');
      const afterProtocol = protocolEndIndex !== -1 ? url.substring(protocolEndIndex + 3) : url;
      
      // 检查协议之后是否有连续斜杠
      if (afterProtocol.includes('//')) {
        setValidationError(t('qrcode.consecutiveSlashes'));
        return false;
      }
    }
    
    // 3. 检测URL参数格式错误
    if (url.includes('?') || url.includes('&')) {
      // 检查是否有单独的&符号（没有?或在?之前）
      const queryStartIndex = url.indexOf('?');
      
      if (queryStartIndex === -1) {
        // 没有?但有&
        setValidationError(t('qrcode.missingQuestionMark'));
        return false;
      }
      
      // 检查?之后的部分是否有连续的&或&开头
      const queryPart = url.substring(queryStartIndex + 1);
      if (queryPart.startsWith('&')) {
        setValidationError(t('qrcode.paramStartsWithAmpersand'));
        return false;
      }
      
      if (queryPart.includes('&&')) {
        setValidationError(t('qrcode.consecutiveAmpersands'));
        return false;
      }
    }
    
    return true;
  }, []);

  // 基于选中的参数生成URL
  const generateUrlFromParams = useCallback((baseUrl: string, selectedKeys: string[]) => {
    try {
      const urlObj = new URL(baseUrl);
      
      // 移除所有参数
      urlObj.search = '';
      
      // 添加选中的URL参数
      params.forEach(param => {
        if (selectedKeys.includes(param.key)) {
          urlObj.searchParams.append(param.key, param.value);
        }
      });
      
      // 添加选中的常用参数
      selectedCommonParams.forEach(param => {
        // 避免重复添加相同的参数（如果URL中已存在同名参数，会覆盖）
        urlObj.searchParams.append(param.key, param.value);
      });
      
      return urlObj.toString();
    } catch (error) {
      console.error('基于参数生成URL失败:', error);
      return baseUrl;
    }
  }, [params, selectedCommonParams]);

  // 解析URL并生成二维码
  const parseUrlAndGenerateQRCode = useCallback(async (url: string) => {
    if (!url) return;
    
    try {
      // 验证URL
      if (validateUrl(url)) {
        // 保存初始URL
        setInitialUrl(url);
        setEditedUrl(url);
        
        // 解析URL参数
        parseUrlParams(url);
        
        // 生成初始二维码
        setGenerating(true);
        const qrResult = await QRCodeGenerator.generate(url, options);
        setCurrentQRCode(qrResult.dataURL);
      }
    } catch (error) {
      console.error('URL处理或二维码生成失败:', error);
    } finally {
      setGenerating(false);
    }
  }, [parseUrlParams, validateUrl, options]);

  // 当解码结果变化时，解析URL并生成初始二维码
  useEffect(() => {
    if (result?.success && result.content && result.type?.includes('url')) {
      parseUrlAndGenerateQRCode(result.content);
    }
  }, [result, parseUrlAndGenerateQRCode]);

  // 当直接提供URL时，解析并生成二维码
  useEffect(() => {
    // 如果 directUrl 存在（包括空字符串），初始化输入框
    if (directUrl !== undefined) {
      if (directUrl && directUrl.trim()) {
        // 直接解析URL并生成二维码，不设置result对象
        const processDirectUrl = async () => {
          const url = directUrl.trim();
          if (validateUrl(url)) {
            setInitialUrl(url);
            setEditedUrl(url);
            parseUrlParams(url);
            
            setGenerating(true);
            try {
              const qrResult = await QRCodeGenerator.generate(url, options);
              setCurrentQRCode(qrResult.dataURL);
              
              // 保存窗口数据（基于窗口ID）
              if (windowId) {
                chrome.storage.local.set({
                  [`qrCodeWindowData_${windowId}`]: {
                    url: url,
                    imageUrl: imageUrl,
                    imageFile: null // 文件对象无法直接存储
                  }
                });
              }
            } catch (error) {
              console.error('URL处理或二维码生成失败:', error);
            } finally {
              setGenerating(false);
            }
          }
        };
        
        processDirectUrl();
      } else {
        // 如果 directUrl 为空字符串，初始化空输入框
        setEditedUrl('');
        setInitialUrl('');
      }
    }
  }, [directUrl, validateUrl, parseUrlParams, options, imageUrl, windowId]);

  // 当窗口关闭时清除存储（基于窗口ID）
  useEffect(() => {
    return () => {
      if (windowId) {
        chrome.storage.local.remove([
          `qrCodeWindowData_${windowId}`,
          `qrCodeWindowState_${windowId}`,
          `floatWindowPosition_${windowId}`,
          `qrCodeWindowName_${windowId}`
        ]);
      }
    };
  }, [windowId]);

  // const copyContent = async () => {
  //   if (!result?.content) return;
  //   try {
  //     await navigator.clipboard.writeText(result.content);
  //   } catch (error) {
  //     console.error('Failed to copy:', error);
  //   }
  // };

  // 处理URL编辑框的变化
  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUrl = e.target.value;
    setEditedUrl(newUrl);
    // 验证URL
    validateUrl(newUrl);
  };

  // 处理参数选择变化
  const handleParamChange = (paramKey: string) => {
    setSelectedParams(prev => {
      let newSelectedParams: string[];
      if (prev.includes(paramKey)) {
        newSelectedParams = prev.filter(key => key !== paramKey);
      } else {
        newSelectedParams = [...prev, paramKey];
      }
      
      // 实时更新链接
      updateUrlWithParams(newSelectedParams);
      
      return newSelectedParams;
    });
  };

  // 处理全选/取消全选
  const handleToggleAllParams = () => {
    let newSelectedParams: string[];
    if (selectedParams.length === params.length) {
      newSelectedParams = [];
    } else {
      newSelectedParams = params.map(param => param.key);
    }
    
    // 实时更新链接
    updateUrlWithParams(newSelectedParams);
    
    setSelectedParams(newSelectedParams);
  };

  // 生成二维码
  const generateQRCode = async () => {
    const url = editedUrl;
    if (!url.trim()) return;
    
    // 1. 先解析URL参数
    parseUrlParams(url);
    
    // 2. 基于当前选择的参数重新生成URL（包括URL参数和常用参数）
    const generatedUrl = generateUrlFromParams(url, selectedParams);
    
    // 3. 验证URL
    if (!validateUrl(generatedUrl)) {
      return;
    }
    
    // 4. 更新编辑框中的URL
    setEditedUrl(generatedUrl);
    
    setGenerating(true);
    try {
      // 5. 使用新生成的URL生成二维码
      const result = await QRCodeGenerator.generate(generatedUrl, options);
      setCurrentQRCode(result.dataURL);
      // 清除之前的错误信息
      setValidationError('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('qrcode.generateFailed');
      console.error('二维码生成失败:', error);
      setValidationError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // 移除自动更新二维码的逻辑，改为用户点击生成时更新

  // 更新URL并验证 - 用于参数变化时实时更新链接
  const updateUrlWithParams = useCallback(async (selectedParams: string[]) => {
    if (!editedUrl.trim()) return;
    
    // 基于当前选择的参数重新生成URL
    const generatedUrl = generateUrlFromParams(editedUrl, selectedParams);
    
    // 验证URL
    validateUrl(generatedUrl);
    
    // 更新编辑框中的URL
    setEditedUrl(generatedUrl);
    
    // 重新生成二维码
    setGenerating(true);
    try {
      // 使用新生成的URL生成二维码
      const result = await QRCodeGenerator.generate(generatedUrl, options);
      setCurrentQRCode(result.dataURL);
      // 清除之前的错误信息
      setValidationError('');
      
      // 移除parseUrlParams调用，避免无限循环
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('qrcode.generateFailed');
      console.error('二维码生成失败:', error);
      setValidationError(errorMsg);
    } finally {
      setGenerating(false);
    }
  }, [editedUrl, generateUrlFromParams, validateUrl, options]);

  // 监听常用参数变化，实时更新链接
  useEffect(() => {
    // 使用立即执行函数处理async逻辑
    (async () => {
      await updateUrlWithParams(selectedParams);
    })();
  }, [selectedCommonParams, selectedParams, updateUrlWithParams]);

  // 下载二维码
  const downloadQRCode = async () => {
    const originalUrl = editedUrl;
    if (!originalUrl.trim()) return;
    
    // 总是基于当前选择的参数重新生成URL（包括URL参数和常用参数）
    const url = generateUrlFromParams(originalUrl, selectedParams);
    
    try {
      await QRCodeGenerator.download(url, 'qrcode.png', options);
      // 清除之前的错误信息
      setValidationError('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('qrcode.downloadFailed');
      console.error('二维码下载失败:', error);
      setValidationError(errorMsg);
    }
  };

  // 复原到初始链接
  const resetToInitialUrl = async () => {
    if (!initialUrl) return;
    
    setEditedUrl(initialUrl);
    setGenerating(true);
    try {
      const result = await QRCodeGenerator.generate(initialUrl, options);
      setCurrentQRCode(result.dataURL);
      // 清除之前的错误信息
      setValidationError('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('qrcode.restoreFailed');
      console.error('二维码复原失败:', error);
      setValidationError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // 处理窗口最小化
  const handleMinimize = () => {
    setIsMinimized(true);
    // 保存最小化状态到存储（基于窗口ID）
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowState_${windowId}`]: {
          minimized: true
        }
      });
    }
  };

  // 处理窗口展开
  const handleExpand = () => {
    setIsMinimized(false);
    // 保存展开状态到存储（基于窗口ID）
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowState_${windowId}`]: {
          minimized: false
        }
      });
    }
  };

  // 处理名称编辑（输入时实时更新）
  const handleNameInput = (newName: string) => {
    setWindowName(newName);
  };

  // 处理名称保存（完成编辑时）
  const handleNameSave = () => {
    setIsEditingName(false);
    // 保存名称到存储
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowName_${windowId}`]: windowName
      });
    }
  };

  // 处理名称取消编辑
  const handleNameCancel = () => {
    // 恢复原始名称
    if (windowId) {
      chrome.storage.local.get([`qrCodeWindowName_${windowId}`], (result) => {
        const savedName = result[`qrCodeWindowName_${windowId}`] || '';
        setWindowName(savedName);
        setIsEditingName(false);
      });
    } else {
      setIsEditingName(false);
    }
  };

  // 处理双击header编辑名称（仅在最小化时）
  const handleHeaderDoubleClick = () => {
    if (isMinimized) {
      setIsEditingName(true);
    }
  };

  // 生成默认标题
  const defaultTitle = (
    <><GenerateIcon size={18} /> {t('qrcode.convertTitle')}</>
  );

  return (
    <FloatWindow
      title={defaultTitle}
      onClose={onClose}
      onMinimize={handleMinimize}
      onExpand={handleExpand}
      minimized={isMinimized}
      minWidth={400}
      minHeight={600}
      windowId={windowId}
      windowName={windowName}
      isEditingName={isEditingName}
      onNameInput={handleNameInput}
      onNameSave={handleNameSave}
      onNameCancel={handleNameCancel}
      onHeaderDoubleClick={handleHeaderDoubleClick}
      minimizedContent={
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px',
          padding: '8px',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {currentQRCode ? (
            <div style={{ 
              width: '160px', 
              height: '160px', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              border: '1px solid rgba(255, 255, 255, 0.6)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img src={currentQRCode} alt={t('qrcode.qrCodeAlt')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>{t('qrcode.noQRCode')}</div>
          )}
        </div>
      }
    >
      <div className="qrcode-decoder-panel">
        {/* 模式切换按钮 */}
        <div className="mode-switcher">
        <button
            className={`mode-switch-btn ${mode === 'generate' ? 'active' : ''}`}
            onClick={() => setMode('generate')}
          >
            <GenerateIcon size={16} /> 生成
          </button>
          <button
            className={`mode-switch-btn ${mode === 'decode' ? 'active' : ''}`}
            onClick={() => setMode('decode')}
          >
            <DecodeIcon size={16} /> 解码
          </button>
        </div>

        {loading && (
          <div className="loading">{t('qrcode.decoding')}</div>
        )}

        {error && (
          <div className="error-message">
            <XIcon size={16} /> {error}
          </div>
        )}

        {/* 解码模式 */}
        {mode === 'decode' && (
          <div className="decode-section">
            <ImageUpload
              onImageSelect={handleImageUpload}
              className="decode-image-upload"
            />
            {previewUrl && (
              <div className="preview-section">
                <img src={previewUrl} alt="QR Code Preview" />
              </div>
            )}
            {result && result.success && (
              <div className="decode-result">
                <div className="decode-result-label">解码结果：</div>
                <div className="decode-result-content">{result.content}</div>
                {result.type === 'url' && (
                  <Button
                    onClick={() => {
                      setMode('generate');
                      const decodedContent = result.content || '';
                      setEditedUrl(decodedContent);
                      setInitialUrl(decodedContent);
                      // 解析URL参数
                      parseUrlParams(decodedContent);
                    }}
                    variant="primary"
                    style={{ marginTop: '12px' }}
                  >
                    <LinkIcon size={16} /> 使用此链接生成二维码
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 生成模式 */}
        {mode === 'generate' && (
          <>
            {/* 当有直接URL、识别成功、或者没有图片时显示内容 */}
            {((directUrl !== undefined) || (result && result.success) || (!imageUrl && !imageFile && !uploadedImageFile)) && (
              <>
                {/* 编辑链接和重新生成二维码的功能，当识别结果是URL、有直接URL、或者没有图片时显示 */}
                {((result && result.type === 'url') || (directUrl !== undefined) || (!imageUrl && !imageFile && !uploadedImageFile)) && (
                  <div className="url-editor-section">
                    <div className="url-editor">
                      <label>{t('qrcode.linkLabel')}</label>
                      <textarea
                        value={editedUrl}
                        onChange={handleUrlChange}
                        rows={3}
                        placeholder={t('qrcode.editLink')}
                      />
                    </div>
                
                {/* 验证错误提示 */}
                {validationError && (
                  <div className="validation-error-message">
                    <XIcon size={16} /> {validationError}
                  </div>
                )}
                
                {/* URL编码信息 */}
                {hasUrlEncoding && decodedUrl && (
                  <div className="url-encoding-info">
                    <div style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>{t('qrcode.decodedUrl')}:</div>
                    <div style={{ 
                      padding: '8px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.5)', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      whiteSpace: 'normal'
                    }}>
                      {decodedUrl}
                    </div>
                  </div>
                )}



                {/* URL参数选择区域 */}
                {params.length > 0 && (
                  <div className="params-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{t('qrcode.urlParams')}</label>
                      <button
                        onClick={handleToggleAllParams}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1890ff',
                          cursor: 'pointer',
                          fontSize: 'var(--qa-font-size-sm)',
                          padding: '0',
                          margin: '0'
                        }}
                      >
                        {selectedParams.length === params.length ? t('qrcode.deselectAll') : t('qrcode.selectAll')}
                      </button>
                    </div>
                    <div className="params-list">
                      {params.map(param => (
                        <div key={param.key} className="param-item">
                          <label className="param-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedParams.includes(param.key)}
                              onChange={() => handleParamChange(param.key)}
                            />
                            <span className="param-key">{param.key}</span>
                            <span className="param-value">={param.value}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 常用参数配置区域 */}
                <div className="params-config-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label>{t('qrcode.commonParams')}</label>
                    {/* <button
                      onClick={() => {
                        // 打开设置页面
                        chrome.runtime.openOptionsPage();
                      }}
                      style={{
                        background: '#f0f0f0',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: 'var(--qa-font-size-xs)',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <PlusIcon size={12} />
                      {t('common.settings')}
                    </button> */}
                  </div>
                  
                  {configs.length > 0 ? (
                    /* 将所有常用参数合并到一个列表中 */
                    <div className="common-params-list">
                      {/* 获取所有配置中的参数 */}
                      {configs.flatMap(config => config.params).map(param => (
                        <div key={`${param.key}-${param.value}`} className="common-param-item">
                          <label className="param-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedCommonParams.some(p => p.key === param.key && p.value === param.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommonParams(prev => [...prev, param]);
                                } else {
                                  setSelectedCommonParams(prev => prev.filter(p => !(p.key === param.key && p.value === param.value)));
                                }
                              }}
                            />
                            <span className="param-key">{param.key}</span>
                            <span className="param-value">={param.value}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-params">
                      {t('settings.noParams')}
                    </div>
                  )}
                </div>

                {/* 二维码显示区域 */}
                <div className="qrcode-display-section">
                  {generating && (
                    <div className="loading">{t('qrcode.generating')}</div>
                  )}
                  {currentQRCode && !generating && (
                    <div className="qrcode-display">
                      <img src={currentQRCode} alt={t('qrcode.qrCodeAlt')} />
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="regenerate-action-buttons">
                  <Button
                    onClick={generateQRCode}
                    variant="primary"
                    disabled={!editedUrl.trim() || generating}
                  >
                    <GenerateIcon size={16} /> {t('common.generate')}
                  </Button>
                  {currentQRCode && (
                    <Button
                      onClick={downloadQRCode}
                      variant="secondary"
                      disabled={generating}
                    >
                      <DownloadIcon size={16} /> {t('common.download')}
                    </Button>
                  )}
                  <Button
                    onClick={resetToInitialUrl}
                    variant="secondary"
                    disabled={generating || !initialUrl}
                  >
                    <RefreshIcon size={16} /> {t('qrcode.restore')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        </>)}
      </div>
    </FloatWindow>
  );
};

