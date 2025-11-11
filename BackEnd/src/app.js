const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
// Rate limiting disabled
// const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

/**
 * Express App Configuration
 * กำหนดค่าและ middleware ต่างๆ สำหรับ Express
 */
const app = express();

// Security Middleware - ปรับ config เพื่อให้ Swagger UI ทำงานได้
// ปิด CSP สำหรับ Swagger UI เพื่อหลีกเลี่ยง SSL error
app.use(helmet({
  contentSecurityPolicy: false, // ปิด CSP เพื่อให้ Swagger UI ทำงานได้
  crossOriginEmbedderPolicy: false, // ปิดเพื่อให้ Swagger UI ทำงานได้
}));

// CORS Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate Limiting (ป้องกัน API Abuse) - DISABLED
// app.use('/api/', apiLimiter);

// Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Skill Test API - Complete',
      version: '1.0.0',
      description: `API Documentation ครบถ้วนสำหรับการทดสอบทักษะ Backend Developer

## วิธีใช้งาน:
1. เลือก Server (Development หรือ Production)
2. สำหรับ endpoints ที่ต้องการ authentication:
   - คลิก "Authorize" ด้านบน
   - ใส่ JWT Token (Bearer Token)
   - หรือใช้ x-api-key สำหรับ Internal APIs
3. ทดสอบ API ได้เลย

## ⚠️ สำคัญ:
- User ธรรมดา: เข้าถึงได้เฉพาะข้อมูลตัวเอง
- Admin: เข้าถึงได้ทุกอย่าง
- แต่ละ role ใช้ token ที่แตกต่างกัน

## Endpoints:
- **Auth**: /api/auth (register, login, me, change-password)
- **Users**: /api/users (CRUD operations)
- **Crypto**: /api/crypto (price data, symbols)
- **Dashboard**: /api/dashboard (statistics, charts)
- **Trading**: /api/trading (simulations, signals, trades)
- **Internal**: /api/internal (admin only)
- **WebSocket**: ws://host:port/ws (real-time updates)`,
      contact: {
        name: 'API Support',
        email: 'nanobotsup@gmail.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:1111',
        description: 'Development Server',
      },
      {
        url: 'http://172.105.118.30:1111',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI Options - ใช้ local resources เพื่อหลีกเลี่ยง SSL error
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Backend API Docs',
  // ไม่ใช้ customCssUrl และ customJs เพราะจะใช้ middleware แก้ไข HTML แทน
  swaggerOptions: {
    persistAuthorization: true, // เก็บ authorization ไว้
    displayRequestDuration: true, // แสดงเวลาที่ใช้ในการ request
    filter: true, // เปิดใช้ filter
    tryItOutEnabled: true, // เปิดใช้ Try it out
    validatorUrl: null, // ปิด validator เพื่อหลีกเลี่ยง external requests
  },
};

// Serve Swagger UI static assets จาก local package
// ใช้ express.static เพื่อ serve files จาก node_modules/swagger-ui-dist
try {
  const swaggerUiDistPath = path.join(__dirname, '../node_modules/swagger-ui-dist');
  // Serve static files จาก swagger-ui-dist โดยตรงที่ root path
  app.use(express.static(swaggerUiDistPath));
  // Serve ที่ /api-docs path ด้วย (เพื่อให้แน่ใจว่าเข้าถึงได้)
  app.use('/api-docs', express.static(swaggerUiDistPath));
  logger.info('✅ Swagger UI static files served from:', swaggerUiDistPath);
} catch (error) {
  logger.warn('Could not serve swagger-ui-dist static files:', error.message);
}

// Function เพื่อแก้ไข HTML และแทนที่ CDN URLs ด้วย local paths
const replaceCDNUrls = (html) => {
  if (typeof html !== 'string') return html;
  
  // แทนที่ CDN URLs ทั้งหมดด้วย local paths (ใช้ regex ที่ครอบคลุมมากขึ้น)
  // แทนที่ https://unpkg.com/swagger-ui-dist@.../swagger-ui.css
  html = html.replace(/https?:\/\/unpkg\.com\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui\.css/gi, '/swagger-ui.css');
  html = html.replace(/https?:\/\/unpkg\.com\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-bundle\.js/gi, '/swagger-ui-bundle.js');
  html = html.replace(/https?:\/\/unpkg\.com\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-standalone-preset\.js/gi, '/swagger-ui-standalone-preset.js');
  html = html.replace(/https?:\/\/unpkg\.com\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-init\.js/gi, '/swagger-ui-init.js');
  
  // แทนที่ cdn.jsdelivr.net
  html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui\.css/gi, '/swagger-ui.css');
  html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-bundle\.js/gi, '/swagger-ui-bundle.js');
  html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-standalone-preset\.js/gi, '/swagger-ui-standalone-preset.js');
  html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@[^"'\s<>]*\/swagger-ui-init\.js/gi, '/swagger-ui-init.js');
  
  // แทนที่ cdnjs.cloudflare.com
  html = html.replace(/https?:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/swagger-ui\/[^"'\s<>]*\/swagger-ui\.css/gi, '/swagger-ui.css');
  html = html.replace(/https?:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/swagger-ui\/[^"'\s<>]*\/swagger-ui-bundle\.js/gi, '/swagger-ui-bundle.js');
  
  // แทนที่ https:// ด้วย local path (fallback)
  html = html.replace(/https:\/\/[^"'\s<>]*swagger-ui\.css/gi, '/swagger-ui.css');
  html = html.replace(/https:\/\/[^"'\s<>]*swagger-ui-bundle\.js/gi, '/swagger-ui-bundle.js');
  html = html.replace(/https:\/\/[^"'\s<>]*swagger-ui-standalone-preset\.js/gi, '/swagger-ui-standalone-preset.js');
  html = html.replace(/https:\/\/[^"'\s<>]*swagger-ui-init\.js/gi, '/swagger-ui-init.js');
  
  // แทนที่ src="https://...swagger-ui..." ด้วย src="/swagger-ui..."
  html = html.replace(/src=["']https?:\/\/[^"']*swagger-ui[^"']*\.(css|js)["']/gi, (match, ext) => {
    if (match.includes('bundle')) return 'src="/swagger-ui-bundle.js"';
    if (match.includes('standalone-preset')) return 'src="/swagger-ui-standalone-preset.js"';
    if (match.includes('init')) return 'src="/swagger-ui-init.js"';
    return `src="/swagger-ui.${ext}"`;
  });
  
  // แทนที่ href="https://...swagger-ui..." ด้วย href="/swagger-ui..."
  html = html.replace(/href=["']https?:\/\/[^"']*swagger-ui[^"']*\.(css|js)["']/gi, (match, ext) => {
    return `href="/swagger-ui.${ext}"`;
  });
  
  // Log ถ้ายังมี CDN URLs อยู่
  if (html.includes('https://') && html.includes('swagger-ui')) {
    logger.warn('⚠️  Still found CDN URLs in HTML after replacement');
  }
  
  return html;
};

// Middleware เพื่อแก้ไข HTML response จาก swagger-ui-express
// แทนที่ CDN URLs ด้วย local paths
const replaceSwaggerCDN = (req, res, next) => {
  const originalSend = res.send;
  const originalEnd = res.end;
  const originalWrite = res.write;
  
  let htmlBuffer = '';
  
  // Override res.write (สำหรับ streaming response)
  res.write = function (chunk, encoding) {
    if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
      htmlBuffer += chunk.toString();
    }
    return originalWrite.call(this, chunk, encoding);
  };
  
  // Override res.send
  res.send = function (data) {
    if (typeof data === 'string' && data.includes('swagger-ui')) {
      data = replaceCDNUrls(data);
      logger.info('✅ Replaced CDN URLs in Swagger UI HTML (res.send)');
    }
    return originalSend.call(this, data);
  };
  
  // Override res.end (บางครั้งใช้ res.end แทน res.send)
  res.end = function (data, encoding) {
    if (data) {
      if (typeof data === 'string' && data.includes('swagger-ui')) {
        data = replaceCDNUrls(data);
        logger.info('✅ Replaced CDN URLs in Swagger UI HTML (res.end)');
      } else if (htmlBuffer && htmlBuffer.includes('swagger-ui')) {
        // ถ้ามี buffer ให้แก้ไข buffer และส่งกลับ
        htmlBuffer = replaceCDNUrls(htmlBuffer);
        originalWrite.call(this, htmlBuffer, encoding);
        htmlBuffer = '';
        return originalEnd.call(this);
      }
    }
    return originalEnd.call(this, data, encoding);
  };
  
  next();
};

// Serve Swagger UI - ใช้ serveFiles เพื่อให้ serve assets จาก local package
// swagger-ui-express จะใช้ static files ที่เรา serve ไว้ข้างบน
const swaggerUiServeFiles = swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions);

// สร้าง custom route สำหรับ Swagger UI ที่แก้ไข HTML โดยตรง
app.get('/api-docs', replaceSwaggerCDN, swaggerUiServeFiles, (req, res, next) => {
  // ใช้ setup middleware
  const setup = swaggerUi.setup(swaggerSpec, swaggerUiOptions);
  
  // Override res.send เพื่อแก้ไข HTML
  const originalSend = res.send;
  res.send = function (html) {
    if (typeof html === 'string' && html.includes('swagger-ui')) {
      html = replaceCDNUrls(html);
      logger.info('✅ Replaced CDN URLs in Swagger UI HTML (custom route)');
    }
    return originalSend.call(this, html);
  };
  
  // เรียก setup
  setup(req, res, next);
});

// API Routes
app.use('/api', routes);

// Welcome Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ยินดีต้อนรับสู่ Backend Skill Test API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      crypto: '/api/crypto',
      dashboard: '/api/dashboard',
      internal: '/api/internal',
      websocket: '/ws',
    },
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;

