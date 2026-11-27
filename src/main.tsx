/**
 * @file src/main.tsx
 * @description 渲染进程 React 根挂载入口，引入 Vditor 基础样式与全局样式体系并包裹 ErrorBoundary
 * @module 渲染进程入口
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'vditor/dist/index.css';
import './styles/index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
