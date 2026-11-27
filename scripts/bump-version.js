/**
 * @file scripts/bump-version.js
 * @description 版本号同步更新脚本，自动递进并同步 package.json、src/data/changelog.json 与安装程序版本号
 * @module 构建与打包脚本
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'src', 'data', 'changelog.json');
const installerCsPath = path.join(rootDir, 'scripts', 'build-installer.cs');

// Parse CLI arguments
const args = process.argv.slice(2);
let customVersion = null;
let descriptions = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--version' || arg === '-v') {
    customVersion = args[++i];
  } else if (arg === '--desc' || arg === '-d') {
    descriptions.push(args[++i]);
  } else if (!customVersion && /^\d+\.\d+\.\d+$/.test(arg.replace(/^v/, ''))) {
    customVersion = arg.replace(/^v/, '');
  } else if (!arg.startsWith('-')) {
    descriptions.push(arg);
  }
}

// Read current data
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
let changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));

function getNextPatchVersion(v) {
  const parts = v.split('.').map(n => parseInt(n, 10));
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let targetVersion = customVersion;
let needInsertNewRelease = descriptions.length > 0;

if (!targetVersion && needInsertNewRelease) {
  targetVersion = getNextPatchVersion(pkg.version);
}

// If user supplied descriptions, create a new release entry in changelog.json
if (needInsertNewRelease) {
  const verTag = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`;
  const today = getTodayString();

  // Mark all previous as not latest
  changelog.forEach(r => { r.isLatest = false; });

  const features = descriptions.map(desc => {
    let type = 'feature';
    let category = '功能更新';
    if (/修复|fix|bug/i.test(desc)) {
      type = 'fix';
      category = '问题修复';
    } else if (/优化|perf|提升/i.test(desc)) {
      type = 'perf';
      category = '体验优化';
    }
    return {
      type,
      category,
      title: desc.length > 20 ? desc.slice(0, 18) + '...' : desc,
      desc
    };
  });

  const newRelease = {
    version: verTag,
    date: today,
    title: `版本 ${verTag} 迭代更新`,
    slogan: '基于极简桌面生产力标准持续优化与功能演进',
    isLatest: true,
    highlights: descriptions.slice(0, 4),
    features
  };

  changelog.unshift(newRelease);
  fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2), 'utf-8');
  console.log(`[Changelog] 已在 src/data/changelog.json 插入新版本 ${verTag} (${today})`);
}

// Sync latest version from changelog to package.json and installer
const latestInChangelog = changelog[0];
const finalVersion = (latestInChangelog ? latestInChangelog.version.replace(/^v/, '') : pkg.version);

if (pkg.version !== finalVersion) {
  pkg.version = finalVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(`[Package] package.json 版本号已同步更新为: ${finalVersion}`);
} else {
  console.log(`[Package] 当前 package.json 版本为最新: ${finalVersion}`);
}

// Sync version in scripts/build-installer.cs
if (fs.existsSync(installerCsPath)) {
  let csContent = fs.readFileSync(installerCsPath, 'utf-8');
  const fourDigit = `${finalVersion}.0`;
  csContent = csContent
    .replace(/\[assembly:\s*AssemblyFileVersion\("[^"]+"\)/g, `[assembly: AssemblyFileVersion("${fourDigit}")`)
    .replace(/\[assembly:\s*AssemblyVersion\("[^"]+"\)/g, `[assembly: AssemblyVersion("${fourDigit}")`)
    .replace(/reg\.SetValue\("DisplayVersion",\s*"[^"]+"\)/g, `reg.SetValue("DisplayVersion", "${finalVersion}")`)
    .replace(/DrawString\("MarkForge · v[^"]+",/g, `DrawString("MarkForge · v${finalVersion}",`);
  fs.writeFileSync(installerCsPath, csContent, 'utf-8');
  console.log(`[Installer] build-installer.cs 版本号已同步更新为: ${finalVersion}`);
}

console.log(`\n========================================`);
console.log(`  MarkForge 发版版本号与更新日志同步完成`);
console.log(`  当前版本: v${finalVersion}`);
console.log(`  发布日期: ${latestInChangelog?.date || getTodayString()}`);
console.log(`  功能项数: ${latestInChangelog?.features?.length || 0} 项更新`);
console.log(`========================================\n`);
