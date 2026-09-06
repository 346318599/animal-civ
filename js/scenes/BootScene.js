/**
 * BootScene — Sprint 1 W1 T1.1 项目骨架占位
 *
 * 当前职责（仅 W1）：
 *  - 显示 "Animal Civ" 标题 + 副标题
 *  - 用 GreyboxFactory 演示 5 个单位占位（5 阵营各 1）+ 2 个建筑占位
 *  - 显示 W1 状态文字（让 W1 T1.5 桌面浏览器 baseline 有可视输出）
 *
 * W2 起将替换为：
 *  - MainMenuScene（主菜单）
 *  - BattleScene（单局战场）
 *  - EventScene（事件卡）
 *  - ResultScene（结算）
 *  - RunSetupScene（起始 buff 三选一）
 */

import { GreyboxFactory, FACTION_COLORS } from '../ui/GreyboxFactory.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const cx = this.scale.width / 2;       // 480
    const cy = this.scale.height / 2;      // 270

    // === 标题区 ===
    this.add.text(cx, 60, 'Animal Civ', {
      fontFamily: 'sans-serif',
      fontSize: '52px',
      color: '#d4af37',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 110, '动物文明 — Web 单机 Roguelike', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#a0a0a0',
    }).setOrigin(0.5);

    // === 灰盒演示区 ===
    const greybox = new GreyboxFactory(this);

    // 5 阵营单位占位（顶部行）
    const factions = Object.keys(FACTION_COLORS).slice(0, 5);  // panda/wolf/lion/bear/parrot
    factions.forEach((faction, i) => {
      const unit = greybox.createUnit(180 + i * 120, 230, faction);
      unit.setData('faction', faction);
    });

    // 阵营名标签
    factions.forEach((faction, i) => {
      this.add.text(180 + i * 120, 270, faction, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#888888',
      }).setOrigin(0.5);
    });

    // 2 个建筑占位（中部行）
    greybox.createBuilding(360, 350, 'base');
    this.add.text(360, 380, 'base', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);

    greybox.createBuilding(600, 350, 'barracks');
    this.add.text(600, 380, 'barracks', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);

    // === W1 状态条 ===
    this.add.text(cx, 470, 'Sprint 1 · W1 T1.1 · 项目骨架 · Phaser 3.90 启动成功', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5);

    this.add.text(cx, 495, '下一里程碑：W1 T1.5 桌面 3 浏览器 baseline + Pages 部署', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#444444',
    }).setOrigin(0.5);

    // === 调试浮窗（W2 起可用 #debug-overlay.show 显示 FPS） ===
    if (window.location.hash === '#debug') {
      document.getElementById('debug-overlay').classList.add('show');
      this.debugText = this.add.text(8, 8, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#888888',
      });
      this.debugText.setScrollFactor(0).setDepth(1000);
    }
  }

  update() {
    if (this.debugText) {
      this.debugText.setText(
        `FPS: ${Math.round(this.game.loop.actualFps)} | ` +
        `BootScene | ` +
        `W1 T1.1`
      );
    }
  }
}