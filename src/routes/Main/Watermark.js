const DEFAULTS = Object.freeze({
  text: '仅用于办理XXXX，他用无效。',
  fontSize: 23,
  fillStyle: 'rgba(100, 100, 100, 0.4)',
  watermarkWidth: 280,
  watermarkHeight: 180,
});

function boundedNumber(value, fallback, min, max) {
  const number = value === '' || value == null ? NaN : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

export function normalizeOptions(options = {}) {
  return {
    text: String(options.text ?? DEFAULTS.text).slice(0, 130),
    fillStyle: options.fillStyle || DEFAULTS.fillStyle,
    fontSize: boundedNumber(options.fontSize, DEFAULTS.fontSize, 10, 99),
    watermarkWidth: boundedNumber(options.watermarkWidth, DEFAULTS.watermarkWidth, 100, 999),
    watermarkHeight: boundedNumber(options.watermarkHeight, DEFAULTS.watermarkHeight, 100, 999),
  };
}

// Preserve the original maximum width and aspect ratio; never upscale.
export function imageSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效。');
  }
  const scale = Math.min(1, 2000 / width);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function canvasTextAutoLine(ctx, width, text, x, y, lineHeight = 20) {
  let line = '';
  for (const char of text) {
    if (char === '\n') {
      ctx.fillText(line, x, y);
      line = '';
      y += lineHeight;
    } else if (line && ctx.measureText(line + char).width > width - x) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line += char;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

export default class Watermark {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tile = document.createElement('canvas');
    if (!this.ctx || !this.tile.getContext('2d')) throw new Error('当前浏览器不支持 Canvas。');
    this.image = null;
    this.step = 0;
    this.requestId = 0;
    this.setOptions(options);
  }

  setOptions(options = {}) {
    this.options = normalizeOptions(options);
    const { text, fontSize, fillStyle, watermarkWidth, watermarkHeight } = this.options;
    this.tile.width = Math.ceil(Math.hypot(watermarkWidth, watermarkHeight));
    this.tile.height = watermarkHeight;
    const ctx = this.tile.getContext('2d');
    const radians = 20 * Math.PI / 180;
    const y = Math.trunc(Math.sin(radians) * watermarkWidth);
    const x = -Math.trunc(y / Math.tan(Math.PI / 2 - radians));
    ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`;
    ctx.rotate(-radians);
    ctx.fillStyle = fillStyle;
    canvasTextAutoLine(ctx, watermarkWidth, text, x + 10, y + fontSize + 20, fontSize * 1.4);
    if (this.image) this.render();
  }

  draw(source) {
    const requestId = ++this.requestId;
    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => {
        // A slower previous selection must never overwrite the latest image.
        if (requestId !== this.requestId) return resolve(false);
        try {
          this.size = imageSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
          this.image = image;
          this.step = 0;
          this.render();
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => {
        if (requestId !== this.requestId) return resolve(false);
        reject(new Error('无法读取图片，请选择有效的 PNG、JPEG、WebP、GIF 或 BMP 文件。'));
      };
      image.src = source;
    });
  }

  render() {
    if (!this.image) return;
    const { width, height } = this.size;
    const { canvas, ctx, step } = this;
    canvas.width = step % 2 ? height : width;
    canvas.height = step % 2 ? width : height;
    // JPEG has no alpha channel: export transparent pixels against white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(step * Math.PI / 2);
    ctx.drawImage(this.image, -width / 2, -height / 2, width, height);
    ctx.restore();
    const pattern = ctx.createPattern(this.tile, 'repeat');
    if (!pattern) throw new Error('无法生成水印。');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  rotate() {
    if (!this.image) return;
    this.step = (this.step + 1) % 4;
    this.render();
  }

  async save(filename = 'watermark.jpg') {
    if (!this.image) throw new Error('请先选择图片。');
    const blob = await new Promise((resolve, reject) => {
      this.canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败。')), 'image/jpeg', 0.95);
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  destroy() {
    this.requestId += 1;
    this.image = null;
  }
}
