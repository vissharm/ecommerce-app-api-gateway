const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const PORT = 3000;

const IS_K8S = process.env.KUBERNETES_SERVICE_HOST ? true : false;
const mapper = {
  'notification-service': process.env.NOTIFICATION_SERVICE_URL,
  'order-service': process.env.ORDER_SERVICE_URL,
  'product-service': process.env.PRODUCT_SERVICE_URL,
  'user-service': process.env.USER_SERVICE_URL
}

// Helper function to get service URL based on environment
const getServiceUrl = (serviceName, defaultPort, suffix = '') => {
  let url = ''
  if (IS_K8S) {
    // In Kubernetes, use internal service DNS names
    // url = `http://${serviceName}.ecommerce.svc.cluster.local:${defaultPort}`;
    url = `http://${serviceName}:${defaultPort}${suffix}`;
  } else {
    // For local development
    url = mapper[serviceName] ||`http://localhost:${defaultPort}${suffix}`;
  }

  console.log(url)
  return url;
};

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Proxy configuration
const proxyConfig = {
  '/api/notifications': {
    target: `${getServiceUrl('notification-service', 3003, '/api/notifications')}`,
    changeOrigin: true,
    proxyTimeout: 10000, // 10 seconds timeout
    timeout: 10000,
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error(`[Notification Service Error] ${req.method} ${req.url}:`, {
        error: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      // Send appropriate error response
      const status = err.code === 'ECONNREFUSED' ? 503 : 
                    err.code === 'ETIMEDOUT' ? 504 : 500;
      
      res.status(status).json({
        error: 'Service temporarily unavailable',
        service: 'notification-service',
        code: err.code
      });
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`${req.method} ${req.url}`);
      console.log('Headers:', req.headers);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/orders': {
    target: `${getServiceUrl('order-service', 3002, '/api/orders')}`,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error(`[Order Service Error] ${req.method} ${req.url}:`, {
        error: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      const status = err.code === 'ECONNREFUSED' ? 503 : 
                    err.code === 'ETIMEDOUT' ? 504 : 500;
      
      res.status(status).json({
        error: 'Service temporarily unavailable',
        service: 'order-service',
        code: err.code
      });
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`${req.method} ${req.url}`);
      console.log('Headers:', req.headers);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/products': {
    target: `${getServiceUrl('product-service', 3004, '/api/products')}`,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error(`[Product Service Error] ${req.method} ${req.url}:`, {
        error: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      const status = err.code === 'ECONNREFUSED' ? 503 : 
                    err.code === 'ETIMEDOUT' ? 504 : 500;
      
      res.status(status).json({
        error: 'Service temporarily unavailable',
        service: 'product-service',
        code: err.code
      });
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`${req.method} ${req.url}`);
      console.log('Headers:', req.headers);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/users': {
    target: `${getServiceUrl('user-service', 3001, '/api/users')}`,
    changeOrigin: true,
    logLevel: 'debug',
    proxyTimeout: 10000,
    timeout: 10000,
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error(`[User Service Error] ${req.method} ${req.url}:`, {
        error: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      const status = err.code === 'ECONNREFUSED' ? 503 : 
                    err.code === 'ETIMEDOUT' ? 504 : 500;
      
      res.status(status).json({
        error: 'Service temporarily unavailable',
        service: 'user-service',
        code: err.code
      });
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`${req.method} ${req.url}`);
      console.log('Headers:', req.headers);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/socket.io': {  // Changed from /websocket to /socket.io
    target: `${getServiceUrl('notification-service', 3003)}`,
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
      console.log(`${req.method} ${req.url}`);
      console.log('Headers:', req.headers);
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


// Add global error handler
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred in the API Gateway'
  });
});

// Add process error handlers
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', {
    reason: reason,
    stack: reason.stack,
    timestamp: new Date().toISOString()
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// Change this from app.listen to server.listen
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
