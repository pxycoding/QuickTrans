export const zh = {
  // 通用
  common: {
    copy: '复制',
    copyAll: '复制全部',
    reset: '重置',
    cancel: '取消',
    save: '保存',
    edit: '编辑',
    delete: '删除',
    close: '关闭',
    minimize: '最小化',
    expand: '展开',
    generate: '生成',
    download: '下载',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    confirm: '确认',
    add: '新增',
    input: '输入',
    paste: '粘贴',
    link: '链接',
    url: 'URL',
    name: '名称',
    value: '值',
    original: '原始',
    result: '结果',
    settings: '设置',
    home: '首页',
    noData: '暂无数据'
  },

  // 应用标题和导航
  app: {
    title: 'QuickTrans',
    subtitle: '时间戳转换 · 二维码生成识别',
    features: '功能介绍',
    settings: '常用参数配置',
    tools: '工具列表'
  },

  // 时间戳转换
  timestamp: {
    title: '时间戳转换',
    inputLabel: '输入时间戳或日期时间',
    inputPlaceholder: '例如: 1704067200 或 2024-01-01 00:00:00',
    convert: '转换',
    emptyInput: '请输入时间戳或日期时间',
    originalValue: '原始值:',
    standardTime: '标准时间:',
    iso8601: 'ISO 8601:',
    unixSecond: 'Unix 时间戳(秒):',
    unixMillisecond: 'Unix 时间戳(毫秒):',
    timeAdjustment: '时间调整:',
    year: '年',
    month: '月',
    day: '日',
    hour: '时',
    minute: '分',
    second: '秒',
    adjustmentHint: '输入正数增加时间，输入负数减少时间',
    convertFailed: '转换失败',
    adjustFailed: '调整失败',
    resetFailed: '重置失败',
    copyAllText: '标准时间: {standard}\nISO 8601: {iso8601}\nUnix(秒): {unix}\nUnix(毫秒): {unixMs}'
  },

  // 二维码
  qrcode: {
    title: '链接 → 二维码',
    decodeTitle: '二维码识别',
    convertTitle: '二维码转化',
    noQRCode: '暂无二维码',
    generating: '生成中...',
    decoding: '识别中...',
    decodeFailed: '识别失败',
    linkLabel: '链接:',
    editLink: '编辑链接...',
    inputOrPasteLink: '输入或粘贴链接...',
    size: '尺寸:',
    errorCorrectionLevel: '容错级别:',
    copyLink: '复制链接',
    restore: '复原',
    urlParams: 'URL参数:',
    commonParams: '常用参数:',
    addParam: '添加参数',
    removeParam: '移除参数',
    windowName: '窗口名称',
    inputWindowName: '输入窗口名称...',
    urlEncoding: 'URL编码',
    decodedUrl: '解码后的URL',
    selectParams: '选择要添加的参数',
    selectAll: '全选',
    deselectAll: '取消全选',
    qrCodeAlt: '二维码',
    invalidUrlEncoding: 'URL包含无效的编码格式',
    consecutiveSlashes: 'URL路径中存在连续的斜杠(/)',
    missingQuestionMark: 'URL参数部分格式错误：缺少问号(?)',
    paramStartsWithAmpersand: 'URL参数部分格式错误：参数不能以&开头',
    consecutiveAmpersands: 'URL参数部分格式错误：存在连续的&符号',
    generateFailed: '二维码生成失败',
    downloadFailed: '二维码下载失败',
    restoreFailed: '二维码复原失败'
  },

  // 功能说明
  features: {
    timestamp: {
      title: '时间戳转换',
      description: '选中时间戳或日期，自动识别并转换'
    },
    qrcodeGenerate: {
      title: '二维码生成',
      description: '选中链接，一键生成二维码'
    },
    qrcodeDecode: {
      title: '二维码识别',
      description: '右键点击二维码图片即可识别'
    },
    usageTips: {
      title: '使用提示',
      tips: [
        '在网页中选中文本，会自动显示操作按钮',
        '右键点击二维码图片，选择"识别二维码"',
        '悬浮窗支持拖拽移动'
      ]
    }
  },

  // 设置页面
  settings: {
    title: '常用Query参数配置',
    addParam: '新增参数',
    editParam: '编辑参数',
    paramName: '参数名:',
    paramValue: '参数值:',
    inputParamName: '输入参数名',
    inputParamValue: '输入参数值',
    noParams: '暂无常用参数配置，点击"新增参数"创建',
    editParamTitle: '编辑参数',
    addParamTitle: '新增参数'
  },

  // 右键菜单
  contextMenu: {
    decodeQRCode: '识别二维码',
    convertTimestamp: '转换时间戳',
    generateQRCode: '生成二维码'
  },

  // 错误消息
  errors: {
    conversionFailed: '转换失败',
    decodeFailed: '识别失败',
    adjustFailed: '调整失败',
    resetFailed: '重置失败',
    saveFailed: '保存失败',
    deleteFailed: '删除失败',
    copyFailed: '复制失败',
    unrecognizedTimestamp: '无法识别的时间戳格式',
    timestampConversionError: '处理时间戳转换时出错',
    unrecognizedQRCodeContent: '无法生成二维码的内容类型',
    qrcodeGenerationError: '处理生成二维码时出错'
  },

  // 语言选择
  language: {
    zh: '中文',
    en: 'English'
  },

  // 网络面板
  network: {
    title: 'QuickTrans Network',
    filterInfo: '仅捕获 xhr/fetch 请求',
    requests: '条请求',
    searchPlaceholder: '搜索URL、方法、状态码... (Cmd/Ctrl+F)',
    allStatus: '全部状态',
    pause: '⏸ 暂停',
    resume: '▶ 继续',
    clear: '清空',
    clearConfirm: '确定要清空所有请求记录吗？',
    mock: '📝 Mock',
    mockTooltip: '添加包含时间戳的测试数据',
    selectRequest: '选择一个请求查看详情',
    noRequests: '暂无请求记录',
    loading: '加载中...',
    response: 'Response',
    request: 'Request',
    headers: 'Headers',
    urls: 'URLs',
    timestamps: '时间戳',
    noResponseContent: '暂无响应内容',
    noRequestBody: '暂无请求体',
    requestHeaders: '请求头',
    responseHeaders: '响应头',
    noUrls: '未找到URL',
    noTimestamps: '未找到时间戳',
    path: '路径',
    original: '原始值',
    standardTime: '标准时间',
    relative: '相对时间',
    actions: '操作',
    adjust: '调整',
    copy: '复制'
  }
};

