/**
 * Animal Civ — main entry
 * Sprint 1 W1 T1.1 + W2 T2.4: Phaser 3.90 Game config + scene registry.
 *
 * Scene flow (W2):
 *   BootScene (W1 demo) -> auto-start BattleScene on W2 T2.4 entry.
 *
 * 设计要点：
 *  - Scale.FIT + CENTER_BOTH：桌面 + 移动端响应式（canvas 16:9 适配）
 *  - 失败兜底：若 Phaser 全局未定义，5s 后报错（提示 CDN 被墙）
 *  - HUD + ActionPanel 是 DOM overlay（不在 Phaser 内），BattleScene 在 create() 注入并 init()
 */

import { BootScene } from './scenes/BootScene.js';
import { BattleScene } from './scenes/BattleScene.js';

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
  scene: [BootScene, BattleScene],
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