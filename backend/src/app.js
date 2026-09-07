/**
 * app.js — Entry point del servidor Express.
 * Responsabilidad ÚNICA: configurar middlewares, rutas y arrancar.
 */
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRouter = require('./controllers/auth.controller');
const inventarioRouter = require('./controllers/inventario.controller');
const ordenesRouter = require('./controllers/ordenes.controller');
const analisisRouter = require('./controllers/analisis.controller');

const app = express();

// Railway (igual que Heroku/Render) coloca la app detrás de un proxy inverso.
// Sin esto, express-rate-limit rechaza cada petición por el header X-Forwarded-For.
app.set('trust proxy', 1);

// ── Seguridad ────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10kb' }));

// Límite general: protege contra ráfagas de peticiones (abuso o DDoS a nivel de aplicación).
// La protección de red completa contra DDoS la da Railway/Cloudflare por delante — esto es
// la segunda capa, a nivel de la propia aplicación.
const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones por IP cada 15 minutos, suficiente para uso normal del panel
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.' },
});
app.use(limiteGeneral);

// Límite más estricto específicamente en login/registro, encima de la protección
// contra fuerza bruta que ya existe por correo — este es por IP.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});
app.use('/api/auth/login', limiteAuth);
app.use('/api/auth/registro', limiteAuth);
app.use('/api/auth/recuperar', limiteAuth);

// ── Rutas ────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/analisis', analisisRouter);

// ── Health check ─────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Tecnocel API v1' }));

// ── Error handler global ─────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌', err.message);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Tecnocel API corriendo en http://localhost:${PORT}`)
);