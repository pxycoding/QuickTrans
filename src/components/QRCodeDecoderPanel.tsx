import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FloatWindow } from './FloatWindow';
import { Button } from './Button';
import { ImageUpload } from './ImageUpload';
import { QRCodeDecoder } from '../converters/QRCodeDecoder';
import { QRCodeGenerator } from '../converters/QRCodeGenerator';
import { QRCodeOptions, QueryParamConfig } from '../types';
import { QrcodeOutlined } from '@ant-design/icons';
import { DecodeIcon, XIcon, RefreshIcon, DownloadIcon, LinkIcon, PlusIcon, GenerateIcon } from './Icons';
import { QueryParamConfigManager } from '../utils/QueryParamConfigManager';
import { extractParamsFromUrl, applyParamsToUrl, parsePathAndQuery } from '../utils/urlQueryParse';
import { useI18n } from '../i18n/useI18n';
import './QRCodeDecoderPanel.css';

interface QRCodeDecoderPanelProps {
  imageUrl?: string;
  imageFile?: File;
  url?: string;
  onClose: () => void;
  minimized?: boolean;
  windowId?: string; // 窗口唯一ID，用于跨tab同步
  showModeSwitcher?: boolean; // 是否显示模式切换按钮，默认true（popup进入时显示，右键菜单进入时不显示）
  /** 恢复时传入的窗口名称（刷新后恢复用） */
  initialWindowName?: string;
  /** 用户保存窗口名称时回调，用于刷新后恢复自定义名称 */
  onWindowNameSave?: (name: string) => void;
  /** 用户收起/展开窗口时回调，用于刷新后恢复展开状态 */
  onMinimizedChange?: (minimized: boolean) => void;
  /** 用户编辑链接/内容时回调，用于刷新后恢复 popup 内输入的内容 */
  onUrlChange?: (url: string) => void;
  /** 恢复时传入的 URL 参数勾选（刷新后恢复） */
  initialSelectedParams?: string[];
  /** 恢复时传入的常用参数勾选（刷新后恢复） */
  initialSelectedCommonParams?: { key: string; value: string }[];
  /** 恢复时传入的完整 URL 参数列表（刷新后 query 列表不丢未勾选项） */
  initialUrlParams?: { key: string; value: string }[];
  /** 用户修改参数勾选后回调；第三参为当前完整 params 列表，用于刷新后恢复 */
  onParamSelectionChange?: (
    selectedParams: string[],
    selectedCommonParams: { key: string; value: string }[],
    urlParams?: { key: string; value: string }[]
  ) => void;
}

interface QueryParam {
  key: string;
  value: string;
}

const LOG = (tag: string, ...args: unknown[]) =>
  console.log('[QRCodeDecoder]', tag, ...args);

/** 从 URL 字符串同步解析出 query 参数（排除常用参数 key），用于即时用当前输入生成 URL，避免依赖尚未更新的 params 状态。支持相对路径如 /page/list?env=test */
function getParamsFromUrl(url: string, commonParamKeys: Set<string>): QueryParam[] {
  try {
    const urlObj = new URL(url);
    const list: QueryParam[] = [];
    urlObj.searchParams.forEach((value, key) => {
      if (!commonParamKeys.has(key)) list.push({ key, value });
    });
    LOG('getParamsFromUrl', { url: url.slice(0, 80), commonKeysSize: commonParamKeys.size, parsedCount: list.length, params: list });
    return list;
  } catch (e) {
    const list = extractParamsFromUrl(url).filter(p => !commonParamKeys.has(p.key));
    LOG('getParamsFromUrl (relative path)', { url: url.slice(0, 80), parsedCount: list.length, params: list });
    return list;
  }
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
  windowId,
  showModeSwitcher = true,
  initialWindowName,
  onWindowNameSave,
  onMinimizedChange,
  onUrlChange,
  initialSelectedParams,
  initialSelectedCommonParams,
  initialUrlParams,
  onParamSelectionChange
}) => {
  const { t } = useI18n();
  const tRef = React.useRef(t);
  tRef.current = t;
  const [result, setResult] = useState<QRCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editedUrl, setEditedUrl] = useState('');
  const editedUrlRef = React.useRef(editedUrl);
  editedUrlRef.current = editedUrl;
  /** 是否已经处理过 directUrl 至少一次（首次从右键打开时勾选 query 参数，之后因常见参数等导致 url 变化时不再自动勾选） */
  const hasProcessedDirectUrlOnceRef = React.useRef(false);
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
  const [windowName, setWindowName] = useState<string>(initialWindowName ?? ''); // 窗口名称（恢复时可由 initialWindowName 传入）
  const [isEditingName, setIsEditingName] = useState(false); // 是否正在编辑名称
  // 如果有传入的图片，默认使用解码模式，否则使用生成模式
  const [mode, setMode] = useState<'decode' | 'generate'>(
    (imageUrl || imageFile) ? 'decode' : 'generate'
  );
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null); // 上传的图片文件
  
  // 调试：打印 showModeSwitcher 的值
  useEffect(() => {
    console.log('[QRCodeDecoderPanel] showModeSwitcher:', showModeSwitcher);
  }, [showModeSwitcher]);

  // 解码 effect 运行计数，用于日志区分多次触发
  const decodeRunIdRef = React.useRef(0);

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
    const runId = ++decodeRunIdRef.current;
    const fileToDecode = uploadedImageFile || imageFile;
    const urlToDecode = !fileToDecode ? imageUrl : undefined;

    console.log('[QRCodeDecoderPanel] decode effect run', {
      runId,
      hasFile: !!fileToDecode,
      hasUrl: !!urlToDecode,
      urlType: urlToDecode ? (urlToDecode.startsWith('data:') ? 'dataURL' : 'http') : null,
      windowId,
      deps: { uploadedImageFile: !!uploadedImageFile, imageUrl: !!imageUrl, imageFile: !!imageFile }
    });

    const decode = async () => {
      if (!fileToDecode && !urlToDecode) {
        console.log('[QRCodeDecoderPanel] decode skip (no source), runId:', runId);
        return;
      }

      console.log('[QRCodeDecoderPanel] setState: loading=true, error/result clear, runId:', runId);
      setLoading(true);
      setError('');
      setResult(null);

      try {
        let decodeResult;
        if (fileToDecode) {
          const url = URL.createObjectURL(fileToDecode);
          setPreviewUrl(url);
          console.log('[QRCodeDecoderPanel] decodeFromFile start, runId:', runId);
          decodeResult = await QRCodeDecoder.decodeFromFile(fileToDecode);
          console.log('[QRCodeDecoderPanel] decodeFromFile done', { runId, success: decodeResult?.success });
        } else if (urlToDecode) {
          setPreviewUrl(urlToDecode);
          console.log('[QRCodeDecoderPanel] decodeFromURL start, runId:', runId);
          decodeResult = await QRCodeDecoder.decodeFromURL(urlToDecode);
          console.log('[QRCodeDecoderPanel] decodeFromURL done', { runId, success: decodeResult?.success });
        }

        if (decodeRunIdRef.current !== runId) {
          console.log('[QRCodeDecoderPanel] decode stale run ignored (effect re-ran)', { runId, current: decodeRunIdRef.current });
          return;
        }
        if (decodeResult?.success) {
          setResult(decodeResult);
          const content = decodeResult.content || '';
          const isFromRightClick = !showModeSwitcher;
          const isDecodedUrl = decodeResult.type === 'url';

          if (isFromRightClick && isDecodedUrl && content) {
            // 右键进入且解码结果为 URL：直接进入生成态，跳过「解码结果 + 使用此链接生成二维码」中间态
            setMode('generate');
            setEditedUrl(content);
            setInitialUrl(content);
            parseUrlParamsRef.current(content);
            setGenerating(true);
            try {
              const qrResult = await QRCodeGenerator.generate(content, options);
              setCurrentQRCode(qrResult.dataURL);
              if (windowId) {
                chrome.storage.local.set({
                  [`qrCodeWindowData_${windowId}`]: {
                    url: content,
                    imageUrl: urlToDecode,
                    imageFile: null
                  }
                });
              }
            } catch (e) {
              console.error('[QRCodeDecoderPanel] 右键直入生成态时生成二维码失败', e);
            } finally {
              setGenerating(false);
            }
          } else if (windowId) {
            chrome.storage.local.set({
              [`qrCodeWindowData_${windowId}`]: {
                url: null,
                imageUrl: urlToDecode,
                imageFile: null
              }
            });
          }
        } else {
          const errMsg = decodeResult?.error || tRef.current('qrcode.decodeFailed');
          console.log('[QRCodeDecoderPanel] setState: error (decode fail)', { runId, errMsg });
          setError(errMsg);
        }
      } catch (err) {
        if (decodeRunIdRef.current !== runId) {
          console.log('[QRCodeDecoderPanel] decode stale run ignored in catch', { runId });
          return;
        }
        const errMsg = err instanceof Error ? err.message : tRef.current('qrcode.decodeFailed');
        console.log('[QRCodeDecoderPanel] setState: error (exception)', { runId, errMsg });
        setError(errMsg);
      } finally {
        if (decodeRunIdRef.current !== runId) {
          console.log('[QRCodeDecoderPanel] decode stale run skipped setLoading(false)', { runId, current: decodeRunIdRef.current });
          return;
        }
        console.log('[QRCodeDecoderPanel] setState: loading=false, runId:', runId);
        setLoading(false);
      }
    };

    decode();
    // 不依赖 t：t 在父组件重渲染时引用会变，会导致 effect 重复执行、出现闪动；用 tRef.current 取最新文案即可
  }, [uploadedImageFile, imageUrl, imageFile, windowId]);

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

  // 加载窗口状态和名称（基于窗口ID；恢复时优先使用 initialWindowName）
  useEffect(() => {
    if (!windowId) return;

    const stateKey = `qrCodeWindowState_${windowId}`;
    const nameKey = `qrCodeWindowName_${windowId}`;
    
    chrome.storage.local.get([stateKey, nameKey], (result) => {
      if (result[stateKey]) {
        setIsMinimized(result[stateKey].minimized || false);
      }
      const name = initialWindowName ?? result[nameKey] ?? '';
      if (name) setWindowName(name);
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

  // 用户编辑链接时防抖回写快照（popup 内输入后刷新可恢复）
  const URL_SYNC_DEBOUNCE_MS = 500;
  useEffect(() => {
    if (!onUrlChange || !windowId) return;
    const timer = window.setTimeout(() => {
      onUrlChange(editedUrl);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [editedUrl, onUrlChange, windowId]);

  // 恢复时应用保存的完整参数列表与勾选状态（仅应用一次），避免刷新后未勾选参数从 query 列表消失
  const appliedInitialParamSelectionRef = React.useRef(false);
  useEffect(() => {
    const hasInitial =
      initialUrlParams !== undefined ||
      initialSelectedParams !== undefined ||
      initialSelectedCommonParams !== undefined;
    if (!hasInitial || appliedInitialParamSelectionRef.current) return;
    appliedInitialParamSelectionRef.current = true;
    if (initialUrlParams !== undefined && initialUrlParams.length > 0) {
      setParams(initialUrlParams);
    }
    if (initialSelectedParams !== undefined) {
      const valid =
        initialUrlParams && initialUrlParams.length > 0
          ? initialSelectedParams.filter((k) => initialUrlParams.some((p) => p.key === k))
          : initialSelectedParams;
      setSelectedParams(valid);
    }
    if (initialSelectedCommonParams !== undefined) {
      setSelectedCommonParams(initialSelectedCommonParams);
    }
  }, [initialUrlParams, initialSelectedParams, initialSelectedCommonParams]);

  // 参数勾选变化时防抖回写快照（含完整 params 列表，刷新后 query 列表不丢项）
  const PARAM_SYNC_DEBOUNCE_MS = 400;
  useEffect(() => {
    if (!onParamSelectionChange || !windowId) return;
    const timer = window.setTimeout(() => {
      onParamSelectionChange(selectedParams, selectedCommonParams, params);
    }, PARAM_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [selectedParams, selectedCommonParams, params, onParamSelectionChange, windowId]);

  // 解析URL参数 - 实现非用户常用参数的追加操作（会更新 params / selectedParams 状态，query 列表依赖这里）
  // skipSelectParams：仅合并到列表、不自动勾选（用于 directUrl 初次加载，避免「点常见参数」导致 query 参数被自动勾选）
  const parseUrlParams = useCallback((url: string, options?: { skipSelectParams?: boolean }) => {
    const { skipSelectParams = false } = options ?? {};
    const commonParamKeys = new Set<string>();
    configs.flatMap(config => config.params).forEach(param => commonParamKeys.add(param.key));
    selectedCommonParams.forEach(param => commonParamKeys.add(param.key));
    initialSelectedCommonParams?.forEach(param => commonParamKeys.add(param.key));

    let newParams: QueryParam[] = [];
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        newParams.push({ key, value });
      });
    } catch {
      newParams = extractParamsFromUrl(url);
    }

    if (newParams.length === 0 && !url.includes('?')) return;

    LOG('parseUrlParams called', { url: url.slice(0, 80), newParams, commonParamKeys: [...commonParamKeys], skipSelectParams });
    setParams(prevParams => {
      const existingParamKeys = new Set(prevParams.map(param => param.key));
      const mergedParams = [...prevParams];
      newParams.forEach(param => {
        if (!existingParamKeys.has(param.key) && !commonParamKeys.has(param.key)) {
          mergedParams.push(param);
        }
      });
      LOG('parseUrlParams setParams', { prevLen: prevParams.length, mergedLen: mergedParams.length, merged: mergedParams });
      return mergedParams;
    });
    if (!skipSelectParams) {
      setSelectedParams(prevSelected => {
        const existingSelected = new Set(prevSelected);
        const updatedSelected = [...prevSelected];
        newParams.forEach(param => {
          if (!existingSelected.has(param.key) && !commonParamKeys.has(param.key)) {
            updatedSelected.push(param.key);
          }
        });
        LOG('parseUrlParams setSelectedParams', { prev: prevSelected, updated: updatedSelected });
        return updatedSelected;
      });
    }
  }, [configs, selectedCommonParams, initialSelectedCommonParams]);

  const parseUrlParamsRef = React.useRef(parseUrlParams);
  parseUrlParamsRef.current = parseUrlParams;

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

  const generateUrlFromParams = useCallback(
    (baseUrl: string, selectedKeys: string[], paramsOverride?: QueryParam[]) => {
      const commonKeys = new Set(selectedCommonParams.map((p) => p.key));
      const paramsToUse = paramsOverride ?? params;
      const selectedParamsList: QueryParam[] = [];
      paramsToUse.forEach(param => {
        if (selectedKeys.includes(param.key) && !commonKeys.has(param.key)) {
          selectedParamsList.push(param);
        }
      });
      selectedCommonParams.forEach(param => selectedParamsList.push(param));

      try {
        const urlObj = new URL(baseUrl);
        urlObj.search = '';
        selectedParamsList.forEach(param => {
          urlObj.searchParams.set(param.key, param.value);
        });
        const out = urlObj.toString();
        LOG('generateUrlFromParams result', { outLen: out.length, preview: out.slice(0, 80) });
        return out;
      } catch (error) {
        const pathname = parsePathAndQuery(baseUrl).pathname;
        const out = applyParamsToUrl(pathname, selectedParamsList);
        LOG('generateUrlFromParams (relative path)', { pathname: pathname.slice(0, 60), outPreview: out.slice(0, 80) });
        return out;
      }
    },
    [params, selectedCommonParams]
  );

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
    LOG('effect directUrl', { directUrl: directUrl?.slice(0, 60), hasDirectUrl: directUrl !== undefined });
    if (directUrl !== undefined) {
      if (directUrl && directUrl.trim()) {
        const processDirectUrl = async () => {
          const url = directUrl.trim();
          if (validateUrl(url)) {
            const isFirstRun = !hasProcessedDirectUrlOnceRef.current;
            if (isFirstRun) hasProcessedDirectUrlOnceRef.current = true;
            LOG('processDirectUrl', { url: url.slice(0, 80), isFirstRun });
            setInitialUrl(url);
            setEditedUrl(url);
            parseUrlParams(url, isFirstRun ? undefined : { skipSelectParams: true });
            
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

  // 当窗口关闭时清除存储（基于窗口ID）。不删除 position/size，供刷新后恢复同位置用；用户主动关闭时由 FloatWindowManager.close 清除
  useEffect(() => {
    return () => {
      if (windowId) {
        chrome.storage.local.remove([
          `qrCodeWindowData_${windowId}`,
          `qrCodeWindowState_${windowId}`,
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
    LOG('handleUrlChange', { len: newUrl.length, preview: newUrl.slice(0, 80) });
    setEditedUrl(newUrl);
    validateUrl(newUrl);
  };

  // 处理参数选择变化：只更新 selectedParams，由 effect 统一调用 updateUrlWithParams，避免重复调用与竞态
  const handleParamChange = (paramKey: string) => {
    setSelectedParams(prev => {
      if (prev.includes(paramKey)) {
        return prev.filter(key => key !== paramKey);
      }
      return [...prev, paramKey];
    });
  };

  // 处理全选/取消全选
  const handleToggleAllParams = () => {
    if (selectedParams.length === params.length) {
      setSelectedParams([]);
    } else {
      setSelectedParams(params.map(param => param.key));
    }
  };

  const generateQRCode = async () => {
    const url = editedUrl;
    LOG('generateQRCode', { url: url.slice(0, 80), selectedParams });
    if (!url.trim()) return;
    parseUrlParams(url);
    const commonKeys = new Set<string>();
    configs.flatMap((c) => c.params).forEach((p) => commonKeys.add(p.key));
    selectedCommonParams.forEach((p) => commonKeys.add(p.key));
    initialSelectedCommonParams?.forEach((p) => commonKeys.add(p.key));
    const urlParams = getParamsFromUrl(url, commonKeys);
    const generatedUrl = generateUrlFromParams(url, selectedParams, urlParams);
    LOG('generateQRCode generated', { generatedUrl: generatedUrl.slice(0, 80) });
    if (!validateUrl(generatedUrl)) return;
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

  // 更新URL并验证 - 仅由「勾选参数/常用参数」变化触发；内部读 editedUrlRef 避免因 editedUrl 变化导致 effect 在用户输入时跑一遍把未输完的 ? 清掉
  const updateUrlWithParams = useCallback(
    async (selectedParamsList: string[]) => {
      const currentUrl = editedUrlRef.current.trim();
      LOG('updateUrlWithParams entry', { currentUrl: currentUrl.slice(0, 80), selectedParamsList, paramsLen: params.length });
      if (!currentUrl) return;
      // 用 state 的 params（完整列表）作为生成来源，这样勾选列表里已有但当前 URL 没有的项也能被加进链接；取消时 keysToInclude 直接用 selectedParamsList，空即不加
      const keysToInclude = selectedParamsList;
      const paramsToUse = params;
      LOG('updateUrlWithParams', { keysToInclude, paramsToUseLen: paramsToUse.length });
      const generatedUrl = generateUrlFromParams(currentUrl, keysToInclude, paramsToUse);
      LOG('updateUrlWithParams setEditedUrl', { generatedUrl: generatedUrl.slice(0, 80) });

      validateUrl(generatedUrl);
      setEditedUrl(generatedUrl);

      setGenerating(true);
      try {
        const result = await QRCodeGenerator.generate(generatedUrl, options);
        setCurrentQRCode(result.dataURL);
        setValidationError('');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : t('qrcode.generateFailed');
        console.error('二维码生成失败:', error);
        setValidationError(errorMsg);
      } finally {
        setGenerating(false);
      }
    },
    [params, generateUrlFromParams, validateUrl, options, configs, selectedCommonParams, initialSelectedCommonParams]
  );

  // 仅当用户勾选/取消勾选参数或常用参数时重新生成链接（updateUrlWithParams 内部读 editedUrlRef，不依赖 editedUrl，故输入时不会触发）
  useEffect(() => {
    LOG('effect updateUrlWithParams trigger', { selectedParams, selectedCommonParamsLen: selectedCommonParams.length });
    (async () => {
      await updateUrlWithParams(selectedParams);
    })();
  }, [selectedCommonParams, selectedParams, updateUrlWithParams]);

  // 仅失焦或回车时：参数校验、query 解析、并间接触发二维码生成（parseUrlParams 会更新 selectedParams，进而触发 effect 里的 updateUrlWithParams）
  const handleUrlCommit = useCallback(() => {
    if (!editedUrl.trim()) return;
    LOG('url commit (blur/Enter)', { editedUrl: editedUrl.slice(0, 80) });
    validateUrl(editedUrl);
    parseUrlParams(editedUrl);
  }, [editedUrl, validateUrl, parseUrlParams]);

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
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowState_${windowId}`]: { minimized: true }
      });
      onMinimizedChange?.(true);
    }
  };

  // 处理窗口展开
  const handleExpand = () => {
    setIsMinimized(false);
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowState_${windowId}`]: { minimized: false }
      });
      onMinimizedChange?.(false);
    }
  };

  // 处理名称编辑（输入时实时更新）
  const handleNameInput = (newName: string) => {
    setWindowName(newName);
  };

  // 处理名称保存（失焦或按 Enter 时调用，传入当前编辑好的名称）
  const handleNameSave = (name: string) => {
    setWindowName(name);
    setIsEditingName(false);
    if (windowId) {
      chrome.storage.local.set({
        [`qrCodeWindowName_${windowId}`]: name
      });
      onWindowNameSave?.(name);
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

  // 生成默认标题（使用 Ant Design 二维码图标）
  const defaultTitle = (
    <><QrcodeOutlined style={{ fontSize: 18, marginRight: 6 }} /> {t('qrcode.convertTitle')}</>
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
        {/* 模式切换按钮 - 只在popup进入时显示 */}
        {showModeSwitcher && (
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
        )}

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
            {/* 从右键/外部传入图片时不显示上传模块 */}
            {!imageUrl && !imageFile && (
              <ImageUpload
                onImageSelect={handleImageUpload}
                className="decode-image-upload"
              />
            )}
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
                        onBlur={handleUrlCommit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUrlCommit();
                          }
                        }}
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

