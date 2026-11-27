/**
 * @file scripts/package-installer.js
 * @description 将 release/win-unpacked 压缩为负载包并嵌入编译生成单文件 MarkForge-Installer.exe 安装包
 * @module 构建与打包脚本
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const unpackedDir = path.join(rootDir, 'release', 'win-unpacked');
const payloadZip = path.join(rootDir, 'release', 'payload.zip');
const installerCs = path.join(rootDir, 'scripts', 'build-installer.cs');
const iconIco = path.join(rootDir, 'resources', 'icon.ico');
const outExe = path.join(rootDir, 'release', 'MarkForge-Installer.exe');

if (!fs.existsSync(unpackedDir)) {
  console.error('Missing release/win-unpacked directory. Run electron-builder first.');
  process.exit(1);
}

// Remove any stale installer binary or temp payload
try { fs.unlinkSync(path.join(unpackedDir, 'MarkForge-Installer.exe')); } catch {}
try { fs.unlinkSync(payloadZip); } catch {}
try { fs.unlinkSync(outExe); } catch {}

console.log('1/2 Compressing MarkForge payload with .NET ZipFile (Optimal speed/size)...');
const psZip = `
Add-Type -AssemblyName System.IO.Compression;
Add-Type -AssemblyName System.IO.Compression.FileSystem;
[System.IO.Compression.ZipFile]::CreateFromDirectory('${unpackedDir.replace(/'/g, "''")}', '${payloadZip.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Optimal, $false);
`.replace(/\r?\n/g, ' ');

execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psZip}"`, { stdio: 'inherit' });

const zipSizeMB = (fs.statSync(payloadZip).size / 1048576).toFixed(2);
console.log(`Payload zip created: ${zipSizeMB} MB`);

console.log('2/2 Compiling ultra-fast native single-file MarkForge-Installer.exe...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const refCompression = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.IO.Compression.dll';
const refCompressionFS = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.IO.Compression.FileSystem.dll';

const cscCmd = [
  `"${cscPath}"`,
  '/nologo',
  '/optimize+',
  '/platform:x64',
  '/target:winexe',
  `/win32icon:"${iconIco}"`,
  `/reference:"${refCompression}"`,
  `/reference:"${refCompressionFS}"`,
  '/reference:Microsoft.CSharp.dll',
  `/resource:"${payloadZip}",MarkForge.payload.zip`,
  `/out:"${outExe}"`,
  `"${installerCs}"`
].join(' ');

execSync(cscCmd, { stdio: 'inherit' });

// Cleanup temporary payload.zip
try { fs.unlinkSync(payloadZip); } catch {}

const finalSizeMB = (fs.statSync(outExe).size / 1048576).toFixed(2);
console.log(`SUCCESS! Built instant-launch MarkForge-Installer.exe (${finalSizeMB} MB)`);
