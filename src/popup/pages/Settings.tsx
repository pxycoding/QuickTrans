import React, { useState, useEffect } from 'react';
import './Settings.css';
import { QueryParamConfig } from '../../types';
import { QueryParamConfigManager } from '../../utils/QueryParamConfigManager';
import { Button } from '../../components/Button';
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/Icons';
import { useI18n } from '../../i18n/useI18n';

export const Settings: React.FC = () => {
  const { t } = useI18n();
  const [params, setParams] = useState<{ key: string; value: string }[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // 加载配置
  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    const loadedConfigs = await QueryParamConfigManager.getConfigs();
    // 将所有配置中的参数合并为一个扁平数组
    const allParams = loadedConfigs.flatMap(config => config.params);
    setParams(allParams);
  };

  // 打开对话框
  const openDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      setNewKey(params[index].key);
      setNewValue(params[index].value);
    } else {
      setEditingIndex(null);
      setNewKey('');
      setNewValue('');
    }
    setShowDialog(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setShowDialog(false);
    setEditingIndex(null);
    setNewKey('');
    setNewValue('');
  };

  // 保存或更新参数
  const saveParam = async () => {
    if (!newKey.trim()) return;

    try {
      const loadedConfigs = await QueryParamConfigManager.getConfigs();
      
      if (editingIndex !== null) {
        // 更新现有参数
        // 查找包含该参数的配置
        const paramToUpdate = params[editingIndex];
        let updatedConfigs = [...loadedConfigs];
        
        // 找到并更新参数
        updatedConfigs = updatedConfigs.map(config => {
          const paramIndex = config.params.findIndex(p => p.key === paramToUpdate.key && p.value === paramToUpdate.value);
          if (paramIndex !== -1) {
            const updatedParams = [...config.params];
            updatedParams[paramIndex] = { key: newKey, value: newValue };
            return { ...config, params: updatedParams, updatedAt: Date.now() };
          }
          return config;
        });
        
        // 保存更新后的配置
        await Promise.all(updatedConfigs.map(config => QueryParamConfigManager.deleteConfig(config.id)));
        await Promise.all(updatedConfigs.map(config => QueryParamConfigManager.saveConfig(config)));
      } else {
        // 保存新参数
        // 创建一个临时配置名称
        const configName = `param_${Date.now()}`;
        await QueryParamConfigManager.saveConfig({
          name: configName,
          params: [{ key: newKey, value: newValue }]
        });
      }

      // 重新加载参数
      loadParams();
      // 关闭对话框
      closeDialog();
    } catch (error) {
      console.error(t('errors.saveFailed'), error);
    }
  };

  // 删除参数
  const deleteParam = async (index: number) => {
    try {
      const paramToDelete = params[index];
      const loadedConfigs = await QueryParamConfigManager.getConfigs();
      
      // 查找包含该参数的配置
      const updatedConfigs = loadedConfigs.map(config => {
        const paramIndex = config.params.findIndex(p => p.key === paramToDelete.key && p.value === paramToDelete.value);
        if (paramIndex !== -1) {
          // 如果配置中只有这一个参数，删除整个配置
          if (config.params.length === 1) {
            return null;
          } else {
            // 否则删除该参数
            const updatedParams = config.params.filter(p => 
              !(p.key === paramToDelete.key && p.value === paramToDelete.value)
            );
            return { ...config, params: updatedParams, updatedAt: Date.now() };
          }
        }
        return config;
      }).filter(Boolean) as QueryParamConfig[];
      
      // 保存更新后的配置
      await Promise.all(loadedConfigs.map(config => QueryParamConfigManager.deleteConfig(config.id)));
      await Promise.all(updatedConfigs.map(config => QueryParamConfigManager.saveConfig(config)));

      // 重新加载参数
      loadParams();
    } catch (error) {
      console.error(t('errors.deleteFailed'), error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>{t('settings.title')}</h2>
        <Button onClick={() => openDialog()} variant="primary" size="small" className="add-param-btn">
          <PlusIcon size={16} />
          <span>{t('settings.addParam')}</span>
        </Button>
      </div>

      <div className="params-section">
        {params.length > 0 ? (
          <div className="params-list">
            {params.map((param, index) => (
              <div key={index} className="param-item">
                <div className="param-content">
                  <span className="param-key">{param.key}</span>
                  <span className="param-separator">=</span>
                  <span className="param-value">{param.value}</span>
                </div>
                <div className="param-actions">
                  <button
                    onClick={() => openDialog(index)}
                    title={t('settings.editParam')}
                    className="action-btn edit-btn"
                  >
                    <EditIcon size={14} />
                  </button>
                  <button
                    onClick={() => deleteParam(index)}
                    title={t('common.delete')}
                    className="action-btn delete-btn"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-params">
            {t('settings.noParams')}
          </div>
        )}
      </div>

      {/* 参数对话框 */}
      {showDialog && (
        <div className="config-dialog-overlay">
          <div className="config-dialog">
            <div className="config-dialog-header">
              <h3>{editingIndex !== null ? t('settings.editParamTitle') : t('settings.addParamTitle')}</h3>
              <button onClick={closeDialog} className="close-btn">
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="config-dialog-content">
              <div className="dialog-field">
                <label>{t('settings.paramName')}</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t('settings.inputParamName')}
                  className="text-input"
                />
              </div>
              
              <div className="dialog-field">
                <label>{t('settings.paramValue')}</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={t('settings.inputParamValue')}
                  className="text-input"
                />
              </div>
            </div>
            
            <div className="config-dialog-footer">
              <button onClick={closeDialog} className="cancel-btn">
                {t('common.cancel')}
              </button>
              <button onClick={saveParam} className="save-btn" disabled={!newKey.trim()}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};