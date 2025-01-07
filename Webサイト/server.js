const express = require('express');
const axios = require('axios');
//const cors = require('cors');
const { JSDOM } = require('jsdom'); // HTML操作のためのライブラリ
//const {saveRequestHistory, updatePageAccessCount} = require('./firebase')
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

//app.use(cors());
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
let logs = [];
app.get('/fetch-page', async (req, res) => {  
  logs = [];
  const {fastmode, protocol, domain, path, query } = req.query;
  const deepfetch = 'false'


  if (!protocol || !domain) {
    return res.status(400).json({ error: 'Protocol and domain are required' });
  }

  const url = `${protocol}://${domain}${path || ''}${query || ''}`;
  currentUrl = url;
  logs.push(`ReceivedURL: ${currentUrl}`);

  // キャッシュを確認
  const cache_url = `${fastmode}${url}`
  if (cache.has(cache_url)) {
    console.log(`Cache hit for ${url}`);
    return res.json({ data: cache.get(cache_url)});
  }
    // CORSヘッダーを追加
  /*
  res.setHeader('Access-Control-Allow-Origin', '*');  // 全てのドメインからアクセス許可
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // 許可するHTTPメソッド
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // 許可するヘッダー
*/
  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url)/*, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    */

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
    if (fastmode === 'false') {
      await replaceResources(document, domain,deepfetch);
    }
    

    const html = document.documentElement.outerHTML;

    addToCache(`${fastmode}${url}`, html); // キャッシュに追加

    res.json({ data: html ,logs: logs});
    
    const ipAddress =
      req.headers['x-forwarded-for'] || // プロキシを通している場合
      req.connection.remoteAddress || // クライアントのIPアドレス
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;
    /*
    const ipArray = ip.split(',');
    const ipAddress = ipArray.find(ip => /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(ip));
    */
    await update(currentUrl, document.title,ipAddress);
    //await updatePageAccessCount();
    //await saveRequestHistory(req,currentUrl);
//    await updatePageAccessCount();
    
  } catch (error) {
    console.error('Error fetching page:', error.message);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// リソースの置き換え関数
async function replaceResources(document, domain, deepfetch) {
  
  const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
  for (const cssLink of cssLinks) {
    const cssHref = cssLink.href;
    if (cssHref.includes(domain) || deepfetch === 'true') {
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
    if (scriptSrc.includes(domain) || deepfetch === 'true') {
      try {
        logs.push(`scriptSrc: ${scriptSrc}`);
        const scriptResponse = await axios.get(scriptSrc);
        const newScript = document.createElement('script');
        newScript.textContent = scriptResponse.data;
        script.replaceWith(newScript);
      } catch (error) {
        console.error(`Error fetching JavaScript: ${scriptSrc}`, error.message);
      }
    }
  }
  
  /*
  
  
  
  const original = document.querySelectorAll('img[data-original]');
  original.forEach(img => {img.removeAttribute('data-original');});
  const images = document.querySelectorAll('img[src]');
  for (const img of images) {
    const imgSrc = img.src;
    // 制限条件を満たしている場合のみ処理
    if (imgSrc.includes(domain) || deepfetch === 'true') {
      try {
        logs.push(`Processing imgSrc: ${imgSrc}`);
        // APIのURLに変更
        const split = await splitUrl(imgSrc);
        const apiUrl = `https://edu-open-4step.glitch.me/fetch-image?protocol=${encodeURIComponent(split.protocol)}&domain=${encodeURIComponent(split.domain)}&path=${encodeURIComponent(split.path)}&query=${encodeURIComponent(split.query)}`;
        img.src = apiUrl;
        logs.push(`Replaced imgSrc: ${imgSrc} with API URL: ${apiUrl}`);
      } catch (error) {
        console.error(`Error processing image: ${imgSrc}`, error.message);
        logs.push(`Error processing imgSrc: ${imgSrc} - ${error.message}`);
      }
    }
  }
  */

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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const FIREBASE_URL = "https://edu-open-4step-default-rtdb.firebaseio.com";
const fetch = require('node-fetch');

app.get('/resource-usage', async(req, res) => {
  const accessResponse = await fetch(`${FIREBASE_URL}/accessCount.json`);
  const accessCount = (await accessResponse.json()) || 0;
  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2), // Resident Set Size
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2), // Total heap
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2), // Used heap
    external: (memoryUsage.external / 1024 / 1024).toFixed(2), // External memory
    access: accessCount
  };

  res.json({ memoryUsage: memoryInfo });
});



app.get('/sleep_time',(req,res) => {
  console.log(req);
  res.json({ sleep_time: Date.now() });
});



// リクエスト履歴とアクセス数を更新する関数
async function update(url, title,ipAddress) {
  try {
    // リクエスト履歴を取得
    const historyResponse = await fetch(`${FIREBASE_URL}/requestHistory.json`);
    const historyData = await historyResponse.json();

//    let history = historyData || [];
    let history = historyData ? Object.values(historyData) : [];
    if (history.length >= 200) {
      history.shift(); // 最大200件を超えた場合、最も古い履歴を削除
    }

    // 新しい履歴を追加
    const timestamp_now = new Date().toISOString()
    history.push({ url, title,ipAddress,timestamp: timestamp_now });
    /*
    await fetch(`${FIREBASE_URL}/requestHistory.json`, {
      method: "DELETE",
    });
    */
    // リクエスト履歴を保存
    await fetch(`${FIREBASE_URL}/requestHistory.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(history)
    });

    // アクセス数を取得
    const accessResponse = await fetch(`${FIREBASE_URL}/accessCount.json`);
    const accessCount = (await accessResponse.json()) || 0;

    // アクセス数を更新
    await fetch(`${FIREBASE_URL}/accessCount.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessCount + 1)
    });

    console.log("履歴とアクセス数を更新しました");
  } catch (error) {
    console.error("更新中にエラーが発生しました:", error);
  }
}



app.get('/fetch-image', async (req, res) => {
  const {protocol, domain, path, query } = req.query;
  const url = `${protocol}://${domain}${path || ''}${query || ''}`;

  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    // 画像を取得  -----------画像だけじゃなくてリソース全て
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type',response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching image:', error.message);
    res.status(500).send('Error fetching image');
  }
});

function splitUrl(url) {
  const urlPattern = /^(https?):\/\/([^\/]+)(\/.*)?(\?.*)?$/;
  const matches = url.match(urlPattern);
  return matches ? {
    protocol: matches[1],
    domain: matches[2],
    path: matches[3] || '/',
    query: matches[4] || ''
  } : null;
}