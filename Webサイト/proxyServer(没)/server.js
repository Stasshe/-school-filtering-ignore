const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require('axios');
const app = express();

// 静的ファイルの配信 (HTMLフォームを提供)
app.use(express.static("public"));

// プロキシ設定
app.use(
  "/proxy",
  createProxyMiddleware({
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const { protocol, domain, path: reqPath, query } = req.query;
      const newPath = reqPath || '';
      const newQuery = query ? `?${query}` : '';
      return `${protocol}://${domain}${newPath}${newQuery}`;
    },
    router: (req) => {
      const { protocol, domain, path, query } = req.query;
      const targetUrl = `${protocol}://${domain}${path || ''}${query ? `?${query}` : ''}`;
      return targetUrl || "https://example.com"; // デフォルトのターゲットURL
    },
    onProxyRes: (proxyRes, req, res) => {
      const rewriteUrls = (body) => {
        const { protocol, domain, path, query } = req.query;

        return body.replace(
          /(src|href)="\/(.*?)"/g,
          (match, attr, relativePath) => {
            // 新しいリンクの形式を作成
            const newUrl = `https://quick-4step.glitch.me/fetch-image?protocol=${protocol}&domain=${domain}&path=/${relativePath}&query=${query || ''}`;
            // 置き換え用の文字列を返す
            return `${attr}="${newUrl}"`;
          }
        );
      };

      const originalWrite = res.write;
      const originalEnd = res.end;
      let responseBody = "";

      res.write = (chunk) => {
        responseBody += chunk.toString();
      };

      res.end = (...args) => {
        if (responseBody) {
          responseBody = rewriteUrls(responseBody);
          originalWrite.call(res, responseBody);
        }
        originalEnd.apply(res, args);
      };
    }
  })
);

// Glitchは3000番ポートを使用
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});



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