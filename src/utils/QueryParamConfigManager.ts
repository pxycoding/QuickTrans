/**
 * 常用Query参数配置管理器
 */
import { QueryParamConfig } from '../types';
import { Storage } from './storage';

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * 常用Query参数配置管理器
 */
export class QueryParamConfigManager {
  private static readonly STORAGE_KEY = 'queryParamConfigs';

  /**
   * 保存配置
   */
  static async saveConfig(config: Omit<QueryParamConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<QueryParamConfig> {
    const now = Date.now();
    const newConfig: QueryParamConfig = {
      ...config,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };

    const configs = await this.getConfigs();
    configs.push(newConfig);
    await Storage.set(this.STORAGE_KEY, configs);
    return newConfig;
  }

  /**
   * 获取所有配置
   */
  static async getConfigs(): Promise<QueryParamConfig[]> {
    const configs = await Storage.get<QueryParamConfig[]>(this.STORAGE_KEY);
    return configs || [];
  }

  /**
   * 根据ID获取配置
   */
  static async getConfig(id: string): Promise<QueryParamConfig | null> {
    const configs = await this.getConfigs();
    return configs.find(config => config.id === id) || null;
  }

  /**
   * 更新配置
   */
  static async updateConfig(id: string, updates: Partial<Omit<QueryParamConfig, 'id' | 'createdAt'>>): Promise<QueryParamConfig | null> {
    const configs = await this.getConfigs();
    const index = configs.findIndex(config => config.id === id);

    if (index === -1) {
      return null;
    }

    const updatedConfig: QueryParamConfig = {
      ...configs[index],
      ...updates,
      updatedAt: Date.now()
    };

    configs[index] = updatedConfig;
    await Storage.set(this.STORAGE_KEY, configs);
    return updatedConfig;
  }

  /**
   * 删除配置
   */
  static async deleteConfig(id: string): Promise<boolean> {
    const configs = await this.getConfigs();
    const newConfigs = configs.filter(config => config.id !== id);

    if (newConfigs.length === configs.length) {
      return false;
    }

    await Storage.set(this.STORAGE_KEY, newConfigs);
    return true;
  }
}