import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from './levels.js';

test('每个小蜜蜂关卡都有可读的波次与安全的节奏参数',()=>{
  for(const level of LEVELS){
    assert.ok(level.waves.length>=3);
    assert.ok(level.player.lives>=3);
    for(const wave of level.waves){
      assert.ok(wave.rows>0&&wave.cols>0);
      assert.ok(wave.diveEvery>=1.5,'俯冲间隔须保留反应时间');
      assert.ok(wave.health>=1);
    }
    assert.ok(level.boss.health>0&&level.boss.shotEvery>=.8);
  }
});
