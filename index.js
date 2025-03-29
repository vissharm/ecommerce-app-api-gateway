const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const PORT = 3000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Proxy configuration
const proxyConfig = {
  '/api/notifications': {
    target: 'http://localhost:3003/api/notifications',
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/orders': {
    target: 'http://localhost:3002/api/orders',
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/products': {
    target: 'http://localhost:3004/api/products',
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/users': {
    target: 'http://localhost:3001/api/users',
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },

  '/socket.io': {  // Changed from /websocket to /socket.io
    target: 'http://localhost:3003',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    secure: false,
    pathRewrite: {
      '^/socket.io': '/socket.io'
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
    },
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  }
};

// Apply the proxy configuration
Object.keys(proxyConfig).forEach((context) => {
  const proxy = createProxyMiddleware(proxyConfig[context]);
  app.use(context, proxy);
    // Handle WebSocket upgrades for socket.io route
    if (context === '/socket.io') {
      server.on('upgrade', proxy.upgrade);
    }
  });

// Serve the React frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// Change this from app.listen to server.listen
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
