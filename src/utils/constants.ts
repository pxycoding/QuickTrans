/**
 * 常量定义
 */
export const FEEDBACK_TYPES = {
  SUCCESS: {
    color: '#52c41a',
    duration: 2000
  },
  ERROR: {
    color: '#ff4d4f',
    duration: 3000
  },
  LOADING: {
    color: '#1890ff',
    duration: null
  },
  INFO: {
    color: '#1890ff',
    duration: 2000
  }
};

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

