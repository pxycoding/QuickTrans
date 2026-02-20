import { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Tools } from './pages/Tools';
import { useI18n } from '../i18n/useI18n';
import type { Locale } from '../i18n/useI18n';
import {
  getCurrentTimezone,
  getStoredTimezone,
  setStoredTimezone,
  getTimezoneOptions,
} from '../utils/timezone';
import './App.css';

type PageType = 'home' | 'tools' | 'settings';

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('tools');
  const { t, locale, setLocale } = useI18n();
  const [timezone, setTimezone] = useState<string>(() => getCurrentTimezone());
  const timezoneOptions = getTimezoneOptions(locale);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  useEffect(() => {
    getStoredTimezone().then((tz) => setTimezone(tz));
  }, []);

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    setStoredTimezone(tz);
  };

  return (
    <div className={`popup-container lang-${locale}`}>
      <div className={`popup-header ${settingsMenuOpen ? 'settings-menu-open' : ''}`}>
        <div className="popup-header-content">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="subtitle">{t('app.subtitle')}</p>
          </div>
          <div className="header-settings-wrap">
            <button
              type="button"
              className="settings-gear-btn"
              onClick={() => setSettingsMenuOpen((o) => !o)}
              title={t('app.settings')}
              aria-expanded={settingsMenuOpen}
            >
              <GearIcon />
            </button>
            {settingsMenuOpen && (
              <>
                <div className="settings-menu-backdrop" onClick={() => setSettingsMenuOpen(false)} aria-hidden />
                <div className="settings-menu">
                  <div className="settings-menu-item">
                    <label className="settings-menu-label">{t('app.timezone')}</label>
                    <select
                      value={timezone}
                      onChange={(e) => handleTimezoneChange(e.target.value)}
                      className="language-select timezone-select"
                    >
                      {timezoneOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-menu-item">
                    <label className="settings-menu-label">{t('app.language')}</label>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as Locale)}
                      className="language-select"
                    >
                      <option value="zh">{t('language.zh')}</option>
                      <option value="en">{t('language.en')}</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="popup-navigation">
       
        <button
          className={`nav-btn ${currentPage === 'tools' ? 'active' : ''}`}
          onClick={() => setCurrentPage('tools')}
        >
          {t('app.tools')}
        </button>
        <button
          className={`nav-btn ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          {t('app.settings')}
        </button>
        <button
          className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
        >
          {t('app.features')}
        </button>
      </div>
      
      <div className="popup-content">
        {currentPage === 'home' && <Home />}
        {currentPage === 'tools' && <Tools />}
        {currentPage === 'settings' && <Settings />}
      </div>
    </div>
  );
}

