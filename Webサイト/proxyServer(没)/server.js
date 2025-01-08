const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// 静的ファイルの配信 (HTMLフォームを提供)
app.use(express.static("public"));

// プロキシ設定
app.use(
  "/proxy",
  createProxyMiddleware({
    target: "", // ターゲットURLはリクエストごとに設定
    changeOrigin: true,
    pathRewrite: (path, req) => path.replace(/^\/proxy/, ""),
    router: (req) => {
      const { protocol, domain, path, query } = req.query;
      const targetUrl = `${protocol}://${domain}${path || ''}${query ? `?${query}` : ''}`;
      return targetUrl || "https://example.com"; // デフォルトのターゲットURL
    },
  })
);

// Glitchは3000番ポートを使用
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});