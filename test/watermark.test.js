import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions, imageSize, canvasTextAutoLine } from '../src/routes/Main/Watermark.js';

test('default options are valid', () => {
  const options = normalizeOptions();
  assert.equal(options.fontSize, 23);
  assert.equal(options.watermarkWidth, 280);
  assert.equal(options.watermarkHeight, 180);
});
test('empty and non-finite numeric inputs use defaults', () => {
  const options = normalizeOptions({ fontSize: '', watermarkWidth: 'abc', watermarkHeight: Infinity });
  assert.equal(options.fontSize, 23);
  assert.equal(options.watermarkWidth, 280);
  assert.equal(options.watermarkHeight, 180);
});
test('numbers are clamped at lower bounds', () => {
  const options = normalizeOptions({ fontSize: -20, watermarkWidth: 0, watermarkHeight: 3 });
  assert.equal(options.fontSize, 10);
  assert.equal(options.watermarkWidth, 100);
  assert.equal(options.watermarkHeight, 100);
});
test('numbers are clamped at upper bounds', () => {
  const options = normalizeOptions({ fontSize: 1000, watermarkWidth: 10000, watermarkHeight: 10000 });
  assert.equal(options.fontSize, 99);
  assert.equal(options.watermarkWidth, 999);
  assert.equal(options.watermarkHeight, 999);
});
test('numeric strings are accepted', () => {
  assert.equal(normalizeOptions({ fontSize: '31' }).fontSize, 31);
});
test('empty text stays empty and long text is capped', () => {
  assert.equal(normalizeOptions({ text: '' }).text, '');
  assert.equal(normalizeOptions({ text: '水'.repeat(200) }).text.length, 130);
});
test('small images are not upscaled', () => {
  assert.deepEqual(imageSize(640, 400), { width: 640, height: 400 });
});
test('large images keep their aspect ratio', () => {
  assert.deepEqual(imageSize(4000, 1200), { width: 2000, height: 600 });
});
test('thin images always have a positive output size', () => {
  assert.deepEqual(imageSize(10000, 1), { width: 2000, height: 1 });
});
test('invalid dimensions fail early', () => {
  for (const [w, h] of [[0, 1], [1, -1], [NaN, 1], [1, Infinity]]) {
    assert.throws(() => imageSize(w, h), /尺寸无效/);
  }
});
function lines(text, width = 20) {
  const result = [];
  const ctx = { measureText: value => ({ width: [...value].length * 10 }), fillText: (value, x, y) => result.push([value, x, y]) };
  canvasTextAutoLine(ctx, width, text, 0, 20, 20);
  return result;
}
test('automatic wrapping neither drops nor duplicates characters', () => {
  assert.deepEqual(lines('ABCDE'), [['AB', 0, 20], ['CD', 0, 40], ['E', 0, 60]]);
});
test('newlines are rendered explicitly', () => {
  assert.deepEqual(lines('A\nB'), [['A', 0, 20], ['B', 0, 40]]);
});
test('Unicode code points are not split while wrapping', () => {
  assert.deepEqual(lines('甲😀乙', 10), [['甲', 0, 20], ['😀', 0, 40], ['乙', 0, 60]]);
});
test('empty text generates no drawing calls', () => {
  assert.deepEqual(lines(''), []);
});
