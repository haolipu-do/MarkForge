/**
 * @file src/data/changelog.ts
 * @description 封装版本更新日志数据源及 ReleaseVersion/ReleaseFeature TypeScript 接口与当前版本常量
 * @module 版本与数据模块
 */
import rawChangelog from './changelog.json';

export interface ReleaseFeature {
  type: 'feature' | 'fix' | 'perf';
  category: string;
  title: string;
  desc: string;
}

export interface ReleaseVersion {
  version: string;
  date: string;
  title: string;
  slogan: string;
  isLatest?: boolean;
  highlights: string[];
  features: ReleaseFeature[];
}

export const CHANGELOG_DATA: ReleaseVersion[] = rawChangelog as ReleaseVersion[];

export const LATEST_RELEASE: ReleaseVersion = CHANGELOG_DATA[0] || {
  version: 'v1.0.0',
  date: '2026-11-25',
  title: '首个正式发布版',
  slogan: '新生 · 极致纯粹的下一代 Markdown 桌面创作工作台',
  isLatest: true,
  highlights: [],
  features: []
};

export const CURRENT_APP_VERSION = LATEST_RELEASE.version;
