const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { JSDOM } = require('jsdom'); // HTML操作のためのライブラリ
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let currentUrl = ''; // 現在のURLを保持
const cache = new Map(); // キャッシュ用のMap
const MAX_CACHE_SIZE = 40; // キャッシュの最大数

// キャッシュを追加する関数
function addToCache(url, html) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey); // 最古のキャッシュを削除
  }
  cache.set(url, html);
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html'); // index.htmlを返す
});

app.get('/fetch-page', async (req, res) => {
  const {fastmode, protocol, domain, path, query } = req.query;

  if (!protocol || !domain) {
    return res.status(400).json({ error: 'Protocol and domain are required' });
  }

  const url = `${protocol}://${domain}${path || ''}${query || ''}`;
  currentUrl = url;

  // キャッシュを確認
  if (cache.has(url)) {
    console.log(`Cache hit for ${url}`);
    return res.json({ data: cache.get(url) });
  }
    // CORSヘッダーを追加
  /*
  res.setHeader('Access-Control-Allow-Origin', '*');  // 全てのドメインからアクセス許可
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // 許可するHTTPメソッド
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // 許可するヘッダー
*/

  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url);

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const baseTag = document.createElement('base');
    baseTag.href = currentUrl; // 現在のURLを設定
    document.head.appendChild(baseTag);

    const baseUrl = new URL(url);

    // すべてのリンクを絶対参照に変換
    document.querySelectorAll('a[href], img[src], link[href], script[src]').forEach((element) => {
      const attribute = element.hasAttribute('href') ? 'href' : 'src';
      const link = element.getAttribute(attribute);

      if (link && !link.startsWith('http') && !link.startsWith('//')) {
        element.setAttribute(attribute, new URL(link, baseUrl).href);
      }
    });

    // リソースの置き換え
    if (!fastmode) {
      await replaceResources(document, domain);
    }
    

    const html = document.documentElement.outerHTML;

    addToCache(url, html); // キャッシュに追加

    res.json({ data: html });
  } catch (error) {
    console.error('Error fetching page:', error.message);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// リソースの置き換え関数
async function replaceResources(document, domain) {
  const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
  for (const cssLink of cssLinks) {
    const cssHref = cssLink.href;
    if (cssHref.includes(domain)) {
      try {
        const cssResponse = await axios.get(cssHref);
        const styleTag = document.createElement('style');
        styleTag.textContent = cssResponse.data;
        cssLink.replaceWith(styleTag);
      } catch (error) {
        console.error(`Error fetching CSS: ${cssHref}`, error.message);
      }
    }
  }

  const scripts = document.querySelectorAll('script[src]');
  for (const script of scripts) {
    const scriptSrc = script.src;
    if (scriptSrc.includes(domain)) {
      try {
        const scriptResponse = await axios.get(scriptSrc);
        const newScript = document.createElement('script');
        newScript.textContent = scriptResponse.data;
        script.replaceWith(newScript);
      } catch (error) {
        console.error(`Error fetching JavaScript: ${scriptSrc}`, error.message);
      }
    }
  }

  const images = document.querySelectorAll('img[src]');
  for (const img of images) {
    const imgSrc = img.src;
    if (imgSrc.includes(domain)) {
      try {
        const imgResponse = await axios.get(imgSrc, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgResponse.data, 'binary').toString('base64');
        const mimeType = imgResponse.headers['content-type'];
        img.setAttribute('src', `data:${mimeType};base64,${base64}`);
      } catch (error) {
        console.error(`Error fetching image: ${imgSrc}`, error.message);
      }
    }
  }

  const phpLinks = document.querySelectorAll('a[href]');
  for (const link of phpLinks) {
    const href = link.href;
    if (href.includes(domain) && href.endsWith('.php')) {
      try {
        const phpResponse = await axios.get(href);
        link.setAttribute('data-content', phpResponse.data);
      } catch (error) {
        console.error(`Error fetching PHP resource: ${href}`, error.message);
      }
    }
  }
}

app.get('/resource-usage', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2), // Resident Set Size
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2), // Total heap
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2), // Used heap
    external: (memoryUsage.external / 1024 / 1024).toFixed(2) // External memory
  };
  res.json({ memoryUsage: memoryInfo });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});