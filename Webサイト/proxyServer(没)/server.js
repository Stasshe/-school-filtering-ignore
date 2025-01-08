const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");
const app = express();


app.use(express.static("public"));


const rewriteHtml = (html, targetUrl) => {
  // CSSやJSのリンクを書き換えるために正規表現を使用
  return html.replace(/(href|src)="(\/[^"]+)"/g, (match, p1, p2) => {
    // /proxyを挟んで元のURLに変換
    return `${p1}="https://quick-4step.glitch.me/proxy?protocol=${encodeURIComponent(targetUrl.protocol)}&domain=${encodeURIComponent(targetUrl.domain)}&path=${encodeURIComponent(targetUrl.path + p2)}&query=${encodeURIComponent(targetUrl.query)}"`;
  });
};


app.use(
  "/proxy",
  createProxyMiddleware({
    target: "", //動的
    changeOrigin: true,
    pathRewrite: (path, req) => path.replace(/^\/proxy/, ""),
    router: (req) => {
      const { protocol, domain, path, query } = req.query;
      const targetUrl = `${protocol}://${domain}${path || ''}${query ? `?${query}` : ''}`;
      return targetUrl || "https://example.com"; // デフォルトのターゲットURL
    },
    onProxyRes: async (proxyRes, req, res) => {
      let body = '';
      proxyRes.on('data', chunk => {
        body += chunk;
      });

      proxyRes.on('end', () => {
        const { protocol, domain, path, query } = req.query;
        const targetUrl = `${protocol}://${domain}${path || ''}${query ? `?${query}` : ''}`;

        // CORS対応: プロキシレスポンスにCORSヘッダーを追加
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // X-Frame-OptionsやContent-Security-Policyをリセットまたは変更
        res.set('X-Frame-Options', 'ALLOWALL');
        res.set('Content-Security-Policy', 'default-src *; script-src *; style-src *;');

        // 追加: ヘッダー調整
        res.set('Cache-Control', 'no-cache');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.set('Referrer-Policy', 'no-referrer-when-downgrade');

        // User-AgentとRefererの設定
        res.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        res.set('Referer', targetUrl);

        if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
          // HTMLレスポンスの場合はリライト
          body = rewriteHtml(body, targetUrl);
          res.set('Content-Type', 'text/html');
        }
        res.send(body);
      });
    }
  })
);

// Glitchは3000番ポートを使用
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});