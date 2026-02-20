export const en = {
  // Common
  common: {
    copy: 'Copy',
    copyAll: 'Copy All',
    reset: 'Reset',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    minimize: 'Minimize',
    expand: 'Expand',
    generate: 'Generate',
    download: 'Download',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    add: 'Add',
    input: 'Input',
    paste: 'Paste',
    link: 'Link',
    url: 'URL',
    name: 'Name',
    value: 'Value',
    original: 'Original',
    result: 'Result',
    settings: 'Settings',
    home: 'Home',
    noData: 'No Data'
  },

  // App title and navigation
  app: {
    title: 'QuickTrans',
    subtitle: 'Timestamp Conversion · QR Code Generation & Recognition',
    features: 'Features',
    settings: 'Query Parameter Config',
    tools: 'Tools',
    timezone: 'Timezone',
    language: 'Language'
  },

  // Timestamp conversion
  timestamp: {
    title: 'Timestamp Conversion',
    inputLabel: 'Input timestamp or date time',
    inputPlaceholder: 'e.g.: 1704067200 or 2024-01-01 00:00:00',
    convert: 'Convert',
    emptyInput: 'Please input timestamp or date time',
    originalValue: 'Original Value:',
    standardTime: 'Standard Time:',
    iso8601: 'ISO 8601:',
    unixSecond: 'Unix Timestamp (seconds):',
    unixMillisecond: 'Unix Timestamp (milliseconds):',
    timeAdjustment: 'Time Adjustment:',
    year: 'Year',
    month: 'Month',
    day: 'Day',
    hour: 'Hour',
    minute: 'Minute',
    second: 'Second',
    adjustmentHint: 'Enter positive numbers to add time, negative numbers to subtract time',
    convertFailed: 'Conversion failed',
    adjustFailed: 'Adjustment failed',
    resetFailed: 'Reset failed',
    copyAllText: 'Standard Time: {standard}\nISO 8601: {iso8601}\nUnix (seconds): {unix}\nUnix (milliseconds): {unixMs}'
  },

  // QR Code
  qrcode: {
    title: 'Link → QR Code',
    decodeTitle: 'QR Code Recognition',
    convertTitle: 'QR Code Conversion',
    noQRCode: 'No QR Code',
    generating: 'Generating...',
    decoding: 'Decoding...',
    decodeFailed: 'Decode failed',
    linkLabel: 'Link:',
    editLink: 'Edit link...',
    inputOrPasteLink: 'Input or paste link...',
    size: 'Size:',
    errorCorrectionLevel: 'Error Correction Level:',
    copyLink: 'Copy Link',
    restore: 'Restore',
    urlParams: 'URL Parameters:',
    commonParams: 'Common Parameters:',
    addParam: 'Add Parameter',
    removeParam: 'Remove Parameter',
    windowName: 'Window Name',
    inputWindowName: 'Input window name...',
    urlEncoding: 'URL Encoding',
    decodedUrl: 'Decoded URL',
    selectParams: 'Select parameters to add',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    qrCodeAlt: 'QR Code',
    invalidUrlEncoding: 'URL contains invalid encoding format',
    consecutiveSlashes: 'URL path contains consecutive slashes (/)',
    missingQuestionMark: 'URL parameter format error: missing question mark (?)',
    paramStartsWithAmpersand: 'URL parameter format error: parameters cannot start with &',
    consecutiveAmpersands: 'URL parameter format error: consecutive & symbols exist',
    generateFailed: 'QR code generation failed',
    downloadFailed: 'QR code download failed',
    restoreFailed: 'QR code restore failed'
  },

  // Features
  features: {
    timestamp: {
      title: 'Timestamp Conversion',
      description: 'Select timestamp or date, automatically detect and convert'
    },
    qrcodeGenerate: {
      title: 'QR Code Generation',
      description: 'Select link, generate QR code with one click'
    },
    qrcodeDecode: {
      title: 'QR Code Recognition',
      description: 'Right-click on QR code image to recognize'
    },
    usageTips: {
      title: 'Usage Tips',
      tips: [
        'Select text on the webpage, action buttons will appear automatically',
        'Right-click on QR code image, select "Recognize QR Code"',
        'Floating windows support drag and move'
      ]
    }
  },

  // Settings page
  settings: {
    title: 'QueryParam Configuration',
    addParam: 'Add Parameter',
    editParam: 'Edit Parameter',
    paramName: 'Parameter Name:',
    paramValue: 'Parameter Value:',
    inputParamName: 'Input parameter name',
    inputParamValue: 'Input parameter value',
    noParams: 'No common parameter configuration, click "Add Parameter" to create',
    editParamTitle: 'Edit Parameter',
    addParamTitle: 'Add Parameter'
  },

  // Context menu
  contextMenu: {
    decodeQRCode: 'Recognize QR Code',
    convertTimestamp: 'Convert Timestamp',
    generateQRCode: 'Generate QR Code'
  },

  // Error messages
  errors: {
    conversionFailed: 'Conversion failed',
    decodeFailed: 'Decode failed',
    adjustFailed: 'Adjustment failed',
    resetFailed: 'Reset failed',
    saveFailed: 'Save failed',
    deleteFailed: 'Delete failed',
    copyFailed: 'Copy failed',
    unrecognizedTimestamp: 'Unrecognized timestamp format',
    timestampConversionError: 'Error processing timestamp conversion',
    unrecognizedQRCodeContent: 'Cannot generate QR code for this content type',
    qrcodeGenerationError: 'Error processing QR code generation'
  },

  // Language selection
  language: {
    zh: '中文',
    en: 'English'
  },

  // Network panel
  network: {
    title: 'QuickTrans Network',
    filterInfo: 'Only capture xhr/fetch requests',
    requests: 'requests',
    searchPlaceholder: 'Search URL, method, status... (Cmd/Ctrl+F)',
    allStatus: 'All Status',
    pause: '⏸ Pause',
    resume: '▶ Resume',
    clear: 'Clear',
    clearConfirm: 'Are you sure you want to clear all requests?',
    mock: '📝 Mock',
    mockTooltip: 'Add mock request with timestamps',
    selectRequest: 'Select a request to view details',
    noRequests: 'No requests',
    loading: 'Loading...',
    response: 'Response',
    request: 'Request',
    headers: 'Headers',
    urls: 'URLs',
    timestamps: 'Timestamps',
    noResponseContent: 'No response content',
    noRequestBody: 'No request body',
    requestHeaders: 'Request Headers',
    responseHeaders: 'Response Headers',
    noUrls: 'No URLs found',
    noTimestamps: 'No timestamps found',
    path: 'Path',
    original: 'Original',
    standardTime: 'Standard Time',
    relative: 'Relative',
    actions: 'Actions',
    adjust: 'Adjust',
    copy: 'Copy'
  }
};

