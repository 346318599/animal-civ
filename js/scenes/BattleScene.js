/**
 * BattleScene — W2 T2.4 单局战场
 *
 * 职责：
 *  - 渲染 BattleMap（tiles + units + buildings）— 通过 GreyboxFactory 灰盒
 *  - 构造 InputSubsystem（Phaser this.input 当 source）+ InputHandler + SelectionManager
 *  - 订阅 EventBus，把 BattleLoop 状态同步到 HUD + ActionPanel
 *  - ActionPanel "end-turn" 点击 → BattleLoop.advance()
 *
 * 设计要点：
 *  - 本场景在 canvas 内渲染地图，HUD/ActionPanel 是 DOM overlay（不在 Phaser 内）
 *  - 网格固定 12×8，tile 32×32px（合计 384×256），居中画布
 *  - Phaser 画布 960×540 (Scale.FIT)，地图区域左上 16,32 起留 HUD 空间
 *  - 选中高亮：单位容器加一个 stroke ring（setStrokeStyle），DESELECTED 移除
 *  - W2 不实现移动 / 攻击 / 建造（按钮 disabled 由 ActionPanel 控制）
 *
 * W3 起扩展点：
 *  - 把 Phaser source 替换为 SceneEvents.pointermove worldX/Y（已支持）
 *  - 加 path preview / attack preview（render-time only，不改数据层）
 */

import { GreyboxFactory, FACTION_COLORS } from '../ui/GreyboxFactory.js';
import { EventBus } from '../core/EventBus.js';
import { BattleLoop } from '../core/BattleLoop.js';
import { InputSubsystem, InputEvents } from '../core/InputSubsystem.js';
import { InputHandler } from '../core/InputHandler.js';
import { SelectionManager, SelectionEvents } from '../core/SelectionManager.js';
import { BattleMap } from '../core/BattleMap.js';
import { UnitInstance } from '../core/UnitInstance.js';
import { BuildingInstance } from '../core/BuildingInstance.js';
import { Tile } from '../core/Tile.js';
import { HUD } from '../ui/HUD.js';
import { ActionPanel } from '../ui/ActionPanel.js';

const COLS = 12;
const ROWS = 8;
const TILE_SIZE = 32;
const MAP_OFFSET_X = 16;
const MAP_OFFSET_Y = 32;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    // Fail-loud: any throw here used to silently leave BootScene on screen.
    // We log to console AND rethrow so DevTools shows the real error;
    // BootScene remains visible as the placeholder.
    try {
      this._createInner();
    } catch (err) {
      console.error('[BattleScene] create() failed:', err);
      throw err;
    }
  }

  _createInner() {
    // === 1. EventBus + 核心系统（BattleLoop + 输入 + 选择） ===
    this.eventBus = new EventBus();
    this.battleMap = this._buildDemoMap();
    this.battleLoop = new BattleLoop({ eventBus: this.eventBus });

    // Phaser scene.input 当 source — bridge 到 EventBus
    this.inputSubsystem = new InputSubsystem({
      eventBus: this.eventBus,
      source: this._buildPhaserSource(),
    });
    this.inputHandler = new InputHandler({ tileSize: TILE_SIZE });
    this.selectionManager = new SelectionManager({
      eventBus: this.eventBus,
      battleMap: this.battleMap,
      playerFaction: 'panda',
    });

    // === 2. UI overlay（HUD + ActionPanel） ===
    this.hud = new HUD({ eventBus: this.eventBus });
    this.hud.init();
    this.actionPanel = new ActionPanel({
      eventBus: this.eventBus,
      playerFaction: 'panda',
      onAction: (action) => this._onAction(action),
    });
    this.actionPanel.init();

    // === 3. 渲染地图 ===
    this.greybox = new GreyboxFactory(this);
    this._renderMap();

    // === 4. 选中高亮跟踪 ===
    this._selectedContainer = null;
    this._selectedFaction = null;
    this.eventBus.on(SelectionEvents.UNIT_SELECTED, (p) => {
      // Restore previous highlight before showing the new one.
      this._applyHighlight(/* clear= */ true);
      const c = this._unitContainers.get(p.unitId);
      this._selectedContainer = c || null;
      this._selectedFaction = p.faction;
      this._applyHighlight(/* clear= */ false);
    });
    this.eventBus.on(SelectionEvents.DESELECTED, () => {
      this._applyHighlight(/* clear= */ true);
      this._selectedContainer = null;
      this._selectedFaction = null;
    });

    // === 5. 输入桥接：POINTER_DOWN → tile click → SelectionManager ===
    this.eventBus.on(InputEvents.POINTER_DOWN, (p) => {
      if (p.button !== 0 && p.button !== 2) return; // 只处理左/右键
      const tile = this.inputHandler.screenToTile({ x: p.x, y: p.y });
      if (!tile) return;
      this.selectionManager.handleTileClick(tile, { button: p.button });
    });
    this.eventBus.on(InputEvents.POINTER_MOVE, (p) => {
      const tile = this.inputHandler.screenToTile({ x: p.x, y: p.y });
      if (!tile) return;
      this.selectionManager.handleTileHover(tile, this.time?.now ?? Date.now());
    });

    // === 6. 启动 BattleLoop（首回合 TURN_START 自动触发，HUD/ActionPanel 即时显示） ===
    this.battleLoop.start();

    // === 7. Debug FPS 文本（#debug 模式才显示）===
    if (window.location.hash === '#debug') {
      const el = document.getElementById('debug-overlay');
      if (el) el.classList.add('show');
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
        `BattleScene | ` +
        `R${this.battleLoop?.roundNumber ?? 0} ` +
        `P${this.battleLoop?.turnContext?.currentPlayerId ?? '-'} ` +
        `Ph${this.battleLoop?.turnContext?.phase ?? '-'}`
      );
    }
  }

  // ===== private =====

  _onAction(action) {
    if (action === 'end-turn') {
      this.battleLoop.advance();
    }
    // move / attack / build W2 stub: no-op（按钮 enabled 后会暴露给 W3）
  }

  _buildPhaserSource() {
    return {
      onPointerDown: (cb) => this.input.on('pointerdown', (pointer) => {
        cb(pointer.worldX, pointer.worldY, pointer.button);
      }),
      onPointerMove: (cb) => this.input.on('pointermove', (pointer) => {
        cb(pointer.worldX, pointer.worldY);
      }),
      onPointerUp: (cb) => this.input.on('pointerup', (pointer) => {
        cb(pointer.worldX, pointer.worldY, pointer.button);
      }),
      onKeyDown: (cb) => {
        this.input.keyboard?.on('keydown', (event) => {
          cb(event.key, {
            shift: event.shiftKey || false,
            ctrl: event.ctrlKey || false,
            alt: event.altKey || false,
          });
        });
        // Keyboard doesn't have a stable unsubscribe handle from Phaser 3.90;
        // return a no-op so destroy() doesn't crash (subsystem swallows errors).
        return () => {};
      },
    };
  }

  _buildDemoMap() {
    const map = new BattleMap({ cols: COLS, rows: ROWS });
    // 全草地，少量森林/山脉点缀。
    // 注意 Tile 合法地形为 plain/forest/mountain/water/desert（无 'grass'）。
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let terrain = 'plain';
        if ((x === 3 && y === 2) || (x === 8 && y === 5)) terrain = 'forest';
        if ((x === 6 && y === 4))                      terrain = 'mountain';
        map.grid[y][x] = new Tile({ x, y, terrain });
      }
    }
    // Panda 阵营（左上区域）—— 走 BattleMap plain-object API，让
    // BattleMap 自己 mint id 并构造 BuildingInstance / UnitInstance。
    // 不能调 `new BuildingInstance(...)`（漏 id 必抛）或传 `x, y`
    // 平铺（应嵌套成 `position: {x, y}`）。这一块是 W2 T2.4 部署后
    // 用户在 Console 看到的 `BuildingInstance: id must be a non-empty
    // string` 的真正源头（hotfix #1/#2 漏了这一段）。
    map.spawnBuilding({ type: 'base',     faction: 'panda', position: { x: 1,  y: 1 } });
    map.spawnUnit    ({ type: 'soldier',  faction: 'panda', position: { x: 1,  y: 2 } });
    map.spawnUnit    ({ type: 'worker',   faction: 'panda', position: { x: 2,  y: 1 } });
    // Wolf 阵营（右下区域）
    map.spawnBuilding({ type: 'base',     faction: 'wolf',  position: { x: 10, y: 6 } });
    map.spawnUnit    ({ type: 'soldier',  faction: 'wolf',  position: { x: 10, y: 5 } });
    map.spawnUnit    ({ type: 'soldier',  faction: 'wolf',  position: { x: 9,  y: 6 } });
    return map;
  }

  _renderMap() {
    this.tileRects = new Map();      // "x,y" -> Rectangle
    this.unitContainers = new Map(); // unitId -> Container
    this.buildingContainers = new Map(); // buildingId -> Container

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = this.battleMap.getTile(x, y);
        if (!tile) continue;
        const px = MAP_OFFSET_X + x * TILE_SIZE + TILE_SIZE / 2;
        const py = MAP_OFFSET_Y + y * TILE_SIZE + TILE_SIZE / 2;
        const rect = this.greybox.createTile(px, py, tile.terrain);
        rect.setInteractive({ useHandCursor: true });
        this.tileRects.set(`${x},${y}`, rect);
      }
    }
    for (const unit of this.battleMap.units.values()) {
      const c = this._renderUnit(unit);
      if (c) this.unitContainers.set(unit.id, c);
    }
    for (const building of this.battleMap.buildings.values()) {
      this._renderBuilding(building);
    }
  }

  _renderUnit(unit) {
    const tile = this.battleMap.getTile(unit.position.x, unit.position.y);
    if (!tile) return null;
    const px = MAP_OFFSET_X + unit.position.x * TILE_SIZE + TILE_SIZE / 2;
    const py = MAP_OFFSET_Y + unit.position.y * TILE_SIZE + TILE_SIZE / 2;
    const c = this.greybox.createUnit(px, py, unit.faction);
    c.setData('unitId', unit.id);
    c.setData('unit', unit);
    c.setData('baseColor', FACTION_COLORS[unit.faction]?.primary ?? 0x808080);
    return c;
  }

  _renderBuilding(building) {
    const tile = this.battleMap.getTile(building.position.x, building.position.y);
    if (!tile) return null;
    const px = MAP_OFFSET_X + building.position.x * TILE_SIZE + TILE_SIZE / 2;
    const py = MAP_OFFSET_Y + building.position.y * TILE_SIZE + TILE_SIZE / 2;
    const c = this.greybox.createBuilding(px, py, building.type);
    c.setData('buildingId', building.id);
    this.buildingContainers.set(building.id, c);
    return c;
  }

  _applyHighlight(clear) {
    // Restores the previously-selected container to its faction color
    // when `clear` is true, or paints the golden highlight ring when
    // `clear` is false and a container is selected.
    if (clear) {
      // Restore: any prior selection loses its gold stroke. We rely on
      // re-rendering on selection change; here just walk all units and
      // reset strokes to faction accent. Cheap (12×8 demo map).
      for (const c of this.unitContainers.values()) {
        const circle = c.list.find((o) => o instanceof Phaser.GameObjects.Arc);
        if (!circle) continue;
        const baseColor = c.getData('baseColor');
        circle.setStrokeStyle(2, 0xffffff);
        // (accent restored to white — match GreyboxFactory.createUnit)
        if (typeof baseColor === 'number') {
          circle.setFillStyle(baseColor);
        }
      }
      return;
    }
    if (!this._selectedContainer) return;
    const circle = this._selectedContainer.list.find(
      (c) => c instanceof Phaser.GameObjects.Arc
    );
    if (circle) circle.setStrokeStyle(3, 0xd4af37);
  }
}