import { useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';

const IsApplicable: React.FC = () => {
  const location = useLocation();

  // 特定のページパスでのみCSSを適用
  const isSpecificPage = location.pathname.startsWith('/blog/');

  useEffect(() => {
    if (isSpecificPage) {
      // linkタグを動的に生成してheadに追加
      const link: HTMLLinkElement = document.createElement('link');

      link.rel = 'stylesheet';
      link.href = 'static/css/styles4.css';
      document.head.appendChild(link);

      // コンポーネントがアンマウントされたときにlinkタグを削除
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [isSpecificPage]); // ページパスが変わった時に再評価

  return null; // UIのレンダリングは行わない
};

export default IsApplicable;
