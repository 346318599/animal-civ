/**
 * GreyboxFactory — Sprint 1 W1 T1.1 基础灰盒工厂
 *
 * 职责：把阵营/单位/建筑/地块的"灰盒占位渲染"集中到一个文件，
 *       Sprint 1 W1 T1.4 完整规范将在此基础上扩展（greybox-spec.md）。
 *
 * 设计原则（沿用 docs/art-direction/art-bible.md 7 阵营配色）：
 *  - 颜色用 0xRRGGBB 数字（Phaser 接受），不从 CSS 字符串解析
 *  - 所有对象返回 Phaser.Container（方便组合/移动/缩放）
 *  - 单位 14px 半径，建筑 36x36，地块 32x32（W2 起对齐 Tile 数据结构）
 */

// === 7 阵营配色（v1.0 美术细化由 T1.4 greybox-spec 接管） ===
export const FACTION_COLORS = {
  panda:    { primary: 0x000000, accent: 0xffffff }, // 亚洲大熊猫（黑+白）
  wolf:     { primary: 0x5a4a3a, accent: 0xc0c0c0 }, // 欧洲灰狼
  lion:     { primary: 0xc08020, accent: 0xffd700 }, // 非洲非洲狮
  bear:     { primary: 0x704030, accent: 0xf0d090 }, // 北美灰熊
  parrot:   { primary: 0x208040, accent: 0xff4040 }, // 南美金刚鹦鹉
  kangaroo: { primary: 0xa07040, accent: 0xf0c080 }, // 大洋洲袋鼠
  penguin:  { primary: 0x202020, accent: 0xffd700 }, // 南极帝企鹅
};

const BUILDING_COLORS = {
  base:     0x4040c0,  // 主堡（蓝）
  barracks: 0xc08040,  // 兵营（橙）
  farm:     0x40a040,  // 农场（绿）
  mine:     0x808080,  // 矿场（灰）
};

const TERRAIN_COLORS = {
  grass:    0x40a040,
  forest:   0x208030,
  mountain: 0x808080,
  water:    0x4060c0,
  desert:   0xc0a060,
};

export class GreyboxFactory {
  /**
   * @param {Phaser.Scene} scene - 父场景
   */
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 灰盒单位：圆形底盘 + 阵营色 + 首字母标签
   * @param {number} x 中心 x
   * @param {number} y 中心 y
   * @param {string} faction 阵营 key（默认 panda）
   * @returns {Phaser.GameObjects.Container}
   */
  createUnit(x, y, faction = 'panda') {
    const colors = FACTION_COLORS[faction] || FACTION_COLORS.panda;
    const container = this.scene.add.container(x, y);

    const circle = this.scene.add.circle(0, 0, 14, colors.primary);
    circle.setStrokeStyle(2, colors.accent);

    const text = this.scene.add.text(0, 0, faction[0].toUpperCase(), {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([circle, text]);
    container.setData('type', 'unit');
    container.setData('faction', faction);
    return container;
  }

  /**
   * 灰盒建筑：方形 + 类型色 + 首字母标签
   * @param {number} x 中心 x
   * @param {number} y 中心 y
   * @param {string} type 建筑类型（base/barracks/farm/mine）
   * @returns {Phaser.GameObjects.Container}
   */
  createBuilding(x, y, type = 'base') {
    const color = BUILDING_COLORS[type] || 0x808080;
    const container = this.scene.add.container(x, y);

    const rect = this.scene.add.rectangle(0, 0, 36, 36, color);
    rect.setStrokeStyle(2, 0xffffff);

    const text = this.scene.add.text(0, 0, type[0].toUpperCase(), {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([rect, text]);
    container.setData('type', 'building');
    container.setData('buildingType', type);
    return container;
  }

  /**
   * 灰盒地块：32×32 tile（W2 BattleMap 对齐）
   * @param {number} x 中心 x
   * @param {number} y 中心 y
   * @param {string} terrain 地形类型
   * @returns {Phaser.GameObjects.Rectangle}
   */
  createTile(x, y, terrain = 'grass') {
    const color = TERRAIN_COLORS[terrain] || 0x808080;
    const rect = this.scene.add.rectangle(x, y, 32, 32, color);
    rect.setStrokeStyle(1, 0x000000, 0.2);
    rect.setData('type', 'tile');
    rect.setData('terrain', terrain);
    return rect;
  }
}