// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Cover from './components/Cover';
import About from './components/About';
import BlogCard from './components/BlogCard';
//import Comment from './components/Comment';
import BlogMainText from './components/BlogMainText';
// import ArticleDetail from './components/ArticleDetail'; // 記事の詳細表示用
// import NotFound from './components/NotFound'; // 404ページ用

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* トップページに複数コンポーネントを表示 */}
        <Route path="/" element={
          <React.Fragment>
            <Header />
            <Cover />
            <About />
          </React.Fragment>
        } />
        {/* ブログ一覧 */}
        <Route path="/blog" element={
          <React.Fragment>
            <BlogCard />
          </React.Fragment>
        } />
        {/* 特定の記事取得ページ（必要に応じて有効化） */}
        <Route path="/blog/:id" element={
          <React.Fragment>
            <BlogMainText />
          </React.Fragment>
        } />
        {/* 404ページ（必要に応じて有効化） */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
