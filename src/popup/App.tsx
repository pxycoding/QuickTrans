import { useState } from 'react';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { useI18n } from '../i18n/useI18n';
import type { Locale } from '../i18n/useI18n';
import './App.css';

type PageType = 'home' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-header-content">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="subtitle">{t('app.subtitle')}</p>
          </div>
          <div className="language-selector">
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
      </div>
      
      <div className="popup-navigation">
        <button
          className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
        >
          {t('app.features')}
        </button>
        <button
          className={`nav-btn ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          {t('app.settings')}
        </button>
      </div>
      
      <div className="popup-content">
        {currentPage === 'home' ? <Home /> : <Settings />}
      </div>
    </div>
  );
}

