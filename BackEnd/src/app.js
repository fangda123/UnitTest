const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

/**
 * Express App Configuration
 * กำหนดค่าและ middleware ต่างๆ สำหรับ Express
 */
const app = express();

// Security Middleware
app.use(helmet()); // เพิ่มความปลอดภัยด้วย HTTP headers

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

// Rate Limiting (ป้องกัน API Abuse)
app.use('/api/', apiLimiter);

// Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Skill Test API',
      version: '1.0.0',
      description: 'API Documentation สำหรับการทดสอบทักษะ Backend Developer',
      contact: {
        name: 'API Support',
        email: 'nanobotsup@gmail.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development Server',
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Backend API Docs',
}));

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

