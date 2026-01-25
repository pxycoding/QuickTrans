import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ConvertOptions, TimestampResult } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 时间戳转换器
 * @description 将各种时间格式相互转换
 */
export class TimestampConverter {
  /**
   * 将时间戳转换为多种格式
   * @param input 时间戳（秒或毫秒）
   * @param options 转换选项
   */
  static fromTimestamp(
    input: number,
    options: ConvertOptions = {}
  ): TimestampResult {
    if (isNaN(input)) {
      throw new Error('Invalid timestamp: NaN');
    }

    const {
      timezone: tz = dayjs.tz.guess(),
      includeRelative = true
    } = options;

    // 判断是秒级还是毫秒级
    const isMillisecond = input.toString().length === 13;
    const timestamp = isMillisecond ? input : input * 1000;

    let date;
    try {
      date = dayjs(timestamp).tz(tz);
    } catch (e) {
      console.warn('[TimestampConverter] Failed to set timezone, using local time:', e);
      date = dayjs(timestamp);
    }

    if (!date.isValid()) {
      throw new Error('Invalid date generated from timestamp');
    }

    const result: TimestampResult = {
      original: input,
      standard: date.format('YYYY-MM-DD HH:mm:ss'),
      iso8601: date.toISOString(),
      unix: Math.floor(timestamp / 1000),
      unixMs: timestamp,
      timezone: tz
    };

    if (includeRelative) {
      result.relative = date.fromNow();
    }

    return result;
  }

  /**
   * 将日期字符串转换为时间戳
   * @param dateString 日期字符串
   * @param options 转换选项
   */
  static toTimestamp(
    dateString: string,
    options: ConvertOptions = {}
  ): TimestampResult {
    const {
      timezone: tz = dayjs.tz.guess()
    } = options;

    const date = dayjs.tz(dateString, tz);

    if (!date.isValid()) {
      throw new Error('Invalid date string');
    }

    return this.fromTimestamp(date.valueOf(), options);
  }

  /**
   * 时区转换
   */
  static convertTimezone(
    input: number | string,
    fromTimezone: string,
    toTimezone: string
  ): TimestampResult {
    let date: dayjs.Dayjs;

    if (typeof input === 'number') {
      const isMillisecond = input.toString().length === 13;
      const timestamp = isMillisecond ? input : input * 1000;
      date = dayjs(timestamp).tz(fromTimezone);
    } else {
      date = dayjs.tz(input, fromTimezone);
    }

    const converted = date.tz(toTimezone);

    return this.fromTimestamp(converted.valueOf(), { timezone: toTimezone });
  }
}

