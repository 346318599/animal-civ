/**
 * Animal Civ — main entry
 * Sprint 1 W1 T1.1: Phaser 3.90 Game config + BootScene 引导
 *
 * 设计要点：
 *  - Scale.FIT + CENTER_BOTH：桌面 + 移动端响应式（canvas 16:9 适配）
 *  - 仅注册 BootScene 一个 scene（W2 起加 BattleScene / MainMenuScene 等）
 *  - 监听 window load 后再实例化 Game（确保 CDN Phaser 已加载 + DOM 就绪）
 *  - 失败兜底：若 Phaser 全局未定义，5s 后报错（提示 CDN 被墙）
 */

import { BootScene } from './scenes/BootScene.js';

const config = {
  type: Phaser.AUTO,                      // WebGL 优先，Canvas 兜底
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,                          // 16:9 横屏（桌面优先）
  },
  render: {
    pixelArt: false,                      // 灰盒渲染：不开 pixelArt
    antialias: true,
  },
  scene: [BootScene],
};

function boot() {
  if (typeof Phaser === 'undefined') {
    document.getElementById('game-container').innerHTML =
      '<div style="color:#d4af37;padding:24px;font-family:sans-serif">' +
      '<h2>❌ Phaser 3.90 CDN 加载失败</h2>' +
      '<p style="color:#888;margin-top:12px">检查网络（jsdelivr / unpkg 是否可达）；' +
      'W4 风险表已记录：CN 网络下可能需本地 bundle Phaser。</p>' +
      '</div>';
    return;
  }
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

if (document.readyState === 'complete') {
  boot();
} else {
  window.addEventListener('load', boot);
}