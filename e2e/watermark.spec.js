import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const snapshot = page => page.locator('canvas').evaluate(canvas => canvas.toDataURL());
const dimensions = page => page.locator('canvas').evaluate(canvas => [canvas.width, canvas.height]);
async function setNativeInput(locator, value) {
  await locator.evaluate((input, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function openEditor(page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
}
async function upload(page, width = 640, height = 400) {
  const base64 = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#990000';
    ctx.fillRect(0, 0, width / 2, height / 2);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height });
  await page.getByLabel('选择图片').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
}

test('loads the example without script errors or external requests', async ({ page }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1') external.push(request.url());
  });
  await openEditor(page);
  await expect(page.getByRole('heading', { name: '图片加水印' })).toBeVisible();
  expect((await dimensions(page))[0]).toBeGreaterThan(0);
  await upload(page);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('text, color, opacity and numeric inputs redraw safely', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openEditor(page);
  const before = await snapshot(page);
  await page.getByLabel('水印文案').fill('仅用于测试\n他用无效');
  await expect.poll(() => snapshot(page)).not.toBe(before);
  const textChanged = await snapshot(page);
  await setNativeInput(page.locator('#watermark-color'), '#ff0000');
  await expect.poll(() => snapshot(page)).not.toBe(textChanged);
  const colorChanged = await snapshot(page);
  await setNativeInput(page.locator('#watermark-alpha'), '0.8');
  await expect.poll(() => snapshot(page)).not.toBe(colorChanged);
  await page.getByLabel('字体大小').fill('');
  await page.getByLabel('水印框宽').fill('0');
  await page.getByLabel('水印框高').fill('9999');
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('selects a local file and four rotations restore the same pixels', async ({ page }) => {
  await openEditor(page);
  await upload(page);
  await expect.poll(() => dimensions(page)).toEqual([640, 400]);
  const initial = await snapshot(page);
  for (const size of [[400, 640], [640, 400], [400, 640], [640, 400]]) {
    await page.getByRole('button', { name: '旋转', exact: true }).click();
    await expect.poll(() => dimensions(page)).toEqual(size);
  }
  expect(await snapshot(page)).toBe(initial);
});

test('exports a real JPEG download', async ({ page }) => {
  await openEditor(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('watermark.jpg');
  const bytes = await readFile(await download.path());
  expect([...bytes.subarray(0, 3)]).toEqual([255, 216, 255]);
  expect(bytes.length).toBeGreaterThan(1000);
});

test('rejects corrupt images and permits reselecting the same filename', async ({ page }) => {
  await openEditor(page);
  const before = await snapshot(page);
  await page.getByLabel('选择图片').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(page.getByRole('alert')).toContainText('无法读取图片');
  expect(await snapshot(page)).toBe(before);
  await upload(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect.poll(() => dimensions(page)).toEqual([640, 400]);
});

test('limits output width to 2000 pixels', async ({ page }) => {
  await openEditor(page);
  await upload(page, 4000, 1200);
  await expect.poll(() => dimensions(page)).toEqual([2000, 600]);
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeVisible();
});
