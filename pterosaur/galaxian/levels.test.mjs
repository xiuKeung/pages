import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from './levels.js';

test('每个投放突袭关卡都有可读的波次与安全的节奏参数',()=>{
  for(const level of LEVELS){
    assert.ok(level.waves.length>=3);
    assert.ok(level.player.lives>=3);
    for(const wave of level.waves){
      assert.ok(wave.count>0);
      assert.ok(wave.deployEvery>=1.8,'投放间隔须保留反应时间');
      assert.ok(wave.diveSpeed>0&&wave.diveSpeed<=8,'俯冲速度须保留移动空间');
      assert.ok(wave.health>=1);
    }
  }
});
