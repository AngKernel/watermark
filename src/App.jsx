import { useEffect, useRef, useState } from 'react';
import Watermark from './routes/Main/Watermark.js';
import example from './routes/Main/example.jpg';
import wx from './routes/Donation/wx.jpeg';
import zfb from './routes/Donation/zfb.jpg';

const INITIAL = {
  text: '仅用于办理住房公积金，他用无效。',
  hex: '#000000', alpha: 0.4, fontSize: 23, watermarkWidth: 280, watermarkHeight: 180,
};

export default function App() {
  const canvasRef = useRef(null);
  const watermarkRef = useRef(null);
  const [options, setOptions] = useState(INITIAL);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let watermark;
    try {
      watermark = new Watermark(canvasRef.current);
      watermarkRef.current = watermark;
      watermark.draw(example)
        .then(loaded => { if (active && loaded) setReady(true); })
        .catch(reason => { if (active) setError(reason.message); })
        .finally(() => { if (active) setBusy(false); });
    } catch (reason) {
      setError(reason.message);
      setBusy(false);
    }
    return () => {
      active = false;
      watermark?.destroy();
      watermarkRef.current = null;
    };
  }, []);

  useEffect(() => {
    const value = Number.parseInt(options.hex.slice(1), 16);
    watermarkRef.current?.setOptions({
      ...options,
      fillStyle: `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${options.alpha})`,
    });
  }, [options]);

  const change = (key, value) => setOptions(previous => ({ ...previous, [key]: value }));

  const selectFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(file.type) &&
        !(file.type === '' && /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name))) {
      setError('请选择 PNG、JPEG、WebP、GIF 或 BMP 图片。');
      return;
    }
    const watermark = watermarkRef.current;
    if (!watermark) return;
    const url = URL.createObjectURL(file);
    setBusy(true);
    setError('');
    try {
      const loaded = await watermark.draw(url);
      if (loaded && watermarkRef.current === watermark) setReady(true);
    } catch (reason) {
      if (watermarkRef.current === watermark) setError(reason.message);
    } finally {
      URL.revokeObjectURL(url);
      if (watermarkRef.current === watermark) setBusy(false);
    }
  };

  const save = async () => {
    setError('');
    try { await watermarkRef.current.save(); }
    catch (reason) { setError(reason.message); }
  };

  return (
    <main className="page">
      <header>
        <h1>图片加水印</h1>
        <p>图片仅在当前浏览器处理，不上传服务器。</p>
        <p>在证件上添加“仅用于办理XXXX，他用无效。”等用途说明。</p>
        <a href="https://github.com/AngKernel/watermark" target="_blank" rel="noopener noreferrer">查看源码</a>
      </header>
      <section className="editor" aria-label="水印编辑器">
        <div className="controls">
          <div className="buttons">
            <label className={`button file-button${busy ? ' disabled' : ''}`}>
              选择文件
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" aria-label="选择图片" onChange={selectFile} disabled={busy} />
            </label>
            <button type="button" disabled={!ready || busy} onClick={() => watermarkRef.current.rotate()}>旋转</button>
            <button type="button" disabled={!ready || busy} onClick={save}>保存</button>
          </div>
          <label className="field" htmlFor="watermark-text">
            <span>水印文案</span>
            <textarea id="watermark-text" maxLength={130} rows={3} value={options.text} onChange={event => change('text', event.target.value)} />
          </label>
          <label className="field inline" htmlFor="watermark-color">
            <span>水印颜色</span>
            <input id="watermark-color" type="color" value={options.hex} onChange={event => change('hex', event.target.value)} />
            <output>{options.hex}</output>
          </label>
          <label className="field" htmlFor="watermark-alpha">
            <span>不透明度 <output>{Math.round(options.alpha * 100)}%</output></span>
            <input id="watermark-alpha" type="range" min="0" max="1" step="0.01" value={options.alpha} onChange={event => change('alpha', Number(event.target.value))} />
          </label>
          <div className="numbers">
            {[
              ['fontSize', '字体大小', 10, 99],
              ['watermarkWidth', '水印框宽', 100, 999],
              ['watermarkHeight', '水印框高', 100, 999],
            ].map(([key, label, min, max]) => (
              <label className="field" key={key} htmlFor={key}>
                <span>{label}</span>
                <input id={key} type="number" min={min} max={max} step="1" value={options[key]} onChange={event => change(key, event.target.value)} />
              </label>
            ))}
          </div>
          <p className="hint">保存为 JPEG；宽度超过 2000 像素时按比例缩小。透明背景导出为白色，动图仅处理一帧。</p>
          <p role="status" aria-live="polite">{busy ? '正在读取图片…' : ready ? '可以调整水印并保存。' : '请选择图片。'}</p>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="canvas-box">
          <canvas ref={canvasRef} aria-label="水印预览">当前浏览器不支持 Canvas。</canvas>
        </div>
      </section>
      <footer>
        <p>基于原作者 dxcweb 的 Canvas 水印项目，迁移到 Node.js 24。</p>
        <details>
          <summary>支持原作者</summary>
          <div className="donations">
            <figure><img src={wx} alt="原作者微信捐助二维码" width="180" height="180" loading="lazy" /><figcaption>微信</figcaption></figure>
            <figure><img src={zfb} alt="原作者支付宝捐助二维码" width="180" height="180" loading="lazy" /><figcaption>支付宝</figcaption></figure>
          </div>
        </details>
      </footer>
    </main>
  );
}
