import React, { useState, useEffect } from 'react';
import { QRCodeGenerator } from '../../converters/QRCodeGenerator';
import './QRCodeViewer.css';

interface QRCodeViewerProps {
  url: string;
  locale?: 'zh' | 'en';
}

const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ url, locale = 'zh' }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await QRCodeGenerator.generate(url, {
        size: 200,
        margin: 2
      });
      setQrCode(result.dataURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async () => {
    if (!qrCode) return;
    try {
      await QRCodeGenerator.download(url, `qrcode-${Date.now()}.png`, {
        size: 512,
        margin: 2
      });
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  if (loading) {
    return (
      <div className="qrcode-viewer-loading">
        {locale === 'zh' ? '生成中...' : 'Generating...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="qrcode-viewer-error">
        {error}
      </div>
    );
  }

  if (!qrCode) {
    return null;
  }

  return (
    <>
      <div className="qrcode-viewer">
        <img
          src={qrCode}
          alt="QR Code"
          className="qrcode-image"
          onClick={() => setShowModal(true)}
          title={locale === 'zh' ? '点击查看大图' : 'Click to view larger'}
        />
        <div className="qrcode-actions">
          <button
            onClick={() => setShowModal(true)}
            className="qrcode-btn"
          >
            {locale === 'zh' ? '查看' : 'View'}
          </button>
          <button
            onClick={downloadQRCode}
            className="qrcode-btn"
          >
            {locale === 'zh' ? '下载' : 'Download'}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="qrcode-modal" onClick={() => setShowModal(false)}>
          <div className="qrcode-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="qrcode-modal-header">
              <h3>{locale === 'zh' ? '二维码' : 'QR Code'}</h3>
              <button
                className="qrcode-modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="qrcode-modal-body">
              <img src={qrCode} alt="QR Code" className="qrcode-modal-image" />
              <div className="qrcode-modal-url">{url}</div>
            </div>
            <div className="qrcode-modal-footer">
              <button onClick={downloadQRCode} className="qrcode-modal-btn">
                {locale === 'zh' ? '下载' : 'Download'}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="qrcode-modal-btn"
              >
                {locale === 'zh' ? '复制链接' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeViewer;

