# TECNOCEL — PROYECTO FINAL DE ESTADÍAS
## Guía Maestra Completa

---

## 1. RESUMEN EJECUTIVO

| Ítem | Detalle |
|------|---------|
| Nombre del proyecto | Plataforma Web + Bot WhatsApp — Tecnocel Laboratorio Celular |
| Duración estimada | 4–6 semanas |
| Stack principal | HTML · Tailwind · Node.js · Baileys · Python |
| Despliegue | Vercel (frontend) + Railway (backend) |
| Costo infraestructura | $0 MXN (planes gratuitos) |

---

## 2. REQUERIMIENTOS MÍNIMOS DEL DISPOSITIVO

### Hardware mínimo
- RAM: 4 GB (recomendado 8 GB)
- CPU: Dual core 2 GHz o superior
- Disco: 5 GB libres para el proyecto + dependencias
- Conexión a internet estable (para Baileys necesita sesión activa)

### Software necesario (todo gratuito)
```
Node.js 20 LTS       → https://nodejs.org
Python 3.11+         → https://python.org
Git                  → https://git-scm.com
VS Code              → https://code.visualstudio.com
Cuenta GitHub        → https://github.com  (para CI/CD)
Cuenta Vercel        → https://vercel.com  (deploy frontend)
Cuenta Railway       → https://railway.app (deploy backend)
Cuenta Google        → Para Google Sheets API
```

---

## 3. ARQUITECTURA EN CAPAS (Clean Architecture + SOLID)

```
tecnocel/
├── frontend/               ← Capa de Presentación
│   ├── index.html
│   ├── assets/
│   │   ├── videos/         ← Tus videos del taller
│   │   ├── img/
│   │   └── logo.png
│   └── js/
│       ├── main.js         ← Orquestador (un solo punto de entrada)
│       ├── ui/
│       │   ├── cursor.js   ← Módulo: solo maneja el cursor
│       │   ├── nav.js      ← Módulo: solo maneja la nav
│       │   └── forms.js    ← Módulo: solo maneja formularios
│       └── services/
│           └── whatsapp.js ← Módulo: solo construye links de WA
│
├── backend/                ← Capas de Servicio + Repositorio
│   ├── src/
│   │   ├── app.js          ← Entry point de Express
│   │   ├── config/
│   │   │   ├── env.js      ← Variables de entorno
│   │   │   └── sheets.js   ← Config Google Sheets
│   │   ├── controllers/    ← Capa de Presentación (API)
│   │   │   ├── cotizacion.controller.js
│   │   │   └── inventario.controller.js
│   │   ├── services/       ← Capa de Negocio (SOLID: S)
│   │   │   ├── cotizacion.service.js
│   │   │   ├── whatsapp.service.js
│   │   │   └── inventario.service.js
│   │   ├── repositories/   ← Capa de Acceso a Datos
│   │   │   └── sheets.repository.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   └── validate.middleware.js
│   │   └── bot/            ← Módulo WhatsApp
│   │       ├── bot.js
│   │       └── handlers/
│   │           ├── cotizar.handler.js
│   │           └── menu.handler.js
│   ├── .env                ← NUNCA subir a Git
│   ├── .env.example        ← Sí subir (sin valores reales)
│   ├── package.json
│   └── .gitignore
│
└── analytics/              ← Scripts Python
    ├── requirements.txt
    ├── analizar_reparaciones.py
    └── generar_reporte.py
```

---

## 4. PRINCIPIOS SOLID APLICADOS

### S — Responsabilidad Única
Cada módulo/clase tiene UNA sola razón para cambiar.

```javascript
// ✅ CORRECTO: solo una responsabilidad
// services/cotizacion.service.js
class CotizacionService {
  async crearCotizacion(datos) {
    // Solo construye el objeto de cotización
    return {
      id: Date.now(),
      cliente: datos.nombre,
      dispositivo: datos.dispositivo,
      problema: datos.problema,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };
  }
}

// ❌ INCORRECTO: mezcla responsabilidades
class CotizacionService {
  async crearCotizacion(datos) {
    // guarda en sheets Y envía whatsapp Y valida Y registra logs... NO
  }
}
```

### O — Abierto/Cerrado
Abierto para extensión, cerrado para modificación.

```javascript
// handlers/menu.handler.js
const handlers = {
  '1': require('./cotizar.handler'),
  '2': require('./estado.handler'),
  // Para agregar nuevo servicio: solo agrega aquí, no modifica código existente
  '3': require('./inventario.handler'),
};
function handleMessage(msg, opcion) {
  const handler = handlers[opcion];
  if (handler) return handler.handle(msg);
}
```

### Principio de Inyección de Dependencias

```javascript
// repositories/sheets.repository.js
class SheetsRepository {
  constructor(sheetsClient) {   // ← Inyectado, no instanciado aquí
    this.client = sheetsClient;
  }
  async append(hoja, datos) { /* ... */ }
}

// En app.js:
const sheetsClient = new GoogleSheetsClient(config);
const repo = new SheetsRepository(sheetsClient); // Inyección
```

---

## 5. ENCRIPTACIÓN Y SEGURIDAD

### Variables de entorno (.env)
```env
# .env  — NUNCA en Git
PORT=3000
SHEETS_ID=tu_id_de_google_sheets
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
SECRET_KEY=clave_muy_larga_y_aleatoria_32chars
ADMIN_PASSWORD_HASH=$2b$12$... (bcrypt hash)
```

### Encriptar contraseñas con bcrypt
```javascript
// npm install bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Al crear contraseña:
const hash = await bcrypt.hash('mi_contraseña', SALT_ROUNDS);

// Al verificar:
const esValida = await bcrypt.compare('mi_contraseña', hash);
```

### Helmet (headers de seguridad)
```javascript
const helmet = require('helmet');
app.use(helmet()); // Protege contra XSS, clickjacking, etc.
```

### CORS
```javascript
const cors = require('cors');
app.use(cors({ origin: 'https://tecnocel.vercel.app' }));
```

---

## 6. BACKEND — CONFIGURACIÓN EXPRESS

```javascript
// backend/src/app.js
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
require('dotenv').config();

const cotizacionRouter = require('./controllers/cotizacion.controller');

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '10kb' })); // Limitar payload

// Rutas
app.use('/api/cotizaciones', cotizacionRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en :${PORT}`));
```

### Controlador (Capa Presentación API)
```javascript
// controllers/cotizacion.controller.js
const router = require('express').Router();
const CotizacionService = require('../services/cotizacion.service');
const { validarCotizacion } = require('../middlewares/validate.middleware');

const service = new CotizacionService();

router.post('/', validarCotizacion, async (req, res) => {
  try {
    const result = await service.crearCotizacion(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
```

---

## 7. BOT DE WHATSAPP (Baileys)

```javascript
// bot/bot.js
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const menuHandler = require('./handlers/menu.handler');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const socket = makeWASocket({ auth: state });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const texto = msg.message.conversation || '';

    await menuHandler.handle(socket, from, texto);
  });

  socket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot(); // Reconexión automática
    }
  });
}

startBot();
```

### Handler del menú
```javascript
// bot/handlers/menu.handler.js
// SOLID: este módulo solo enruta mensajes
const cotizarHandler = require('./cotizar.handler');

const MENU = `
╔══════════════════════╗
║   🔧 *TECNOCEL*       ║
║   Laboratorio Celular ║
╠══════════════════════╣
║ *1* → Cotizar reparación
║ *2* → Estado de mi equipo
║ *3* → Precios
║ *0* → Hablar con técnico
╚══════════════════════╝
Responde con el número de opción:`;

module.exports = {
  async handle(socket, from, texto) {
    const op = texto.trim();
    if (!op || op === 'hola' || op === 'menu' || op === 'inicio') {
      await socket.sendMessage(from, { text: MENU });
      return;
    }
    if (op === '1') return cotizarHandler.handle(socket, from);
    await socket.sendMessage(from, { text: 'Opción no válida. Escribe *menu* para ver las opciones.' });
  }
};
```

---

## 8. ANALYTICS CON PYTHON

```python
# analytics/analizar_reparaciones.py
import gspread
import pandas as pd
import matplotlib.pyplot as plt
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

SCOPE = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']

def conectar_sheets():
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', SCOPE)
    client = gspread.authorize(creds)
    return client.open_by_key("TU_SHEETS_ID")

def analizar(sheet):
    hoja = sheet.worksheet("Cotizaciones")
    datos = hoja.get_all_records()
    df = pd.DataFrame(datos)

    # Servicio más solicitado
    top_servicios = df['dispositivo'].value_counts().head(5)

    # Graficar
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle('Dashboard Tecnocel', fontsize=14, color='#e91e8c')

    top_servicios.plot(kind='bar', ax=axes[0], color='#e91e8c')
    axes[0].set_title('Reparaciones por tipo')
    axes[0].set_xlabel('')

    print(f"Total cotizaciones: {len(df)}")
    print(top_servicios)

    plt.tight_layout()
    plt.savefig(f'reporte_{datetime.now().strftime("%Y%m")}.png', dpi=150, bbox_inches='tight')
    plt.show()

if __name__ == '__main__':
    sheet = conectar_sheets()
    analizar(sheet)
```

---

## 9. DESPLIEGUE PASO A PASO

### 9.1 Subir el código a GitHub
```bash
git init
git add .
git commit -m "feat: proyecto inicial Tecnocel"
git remote add origin https://github.com/tuusuario/tecnocel.git
git push -u origin main
```

### 9.2 Deploy del Frontend en Vercel (GRATIS)
1. Entra a https://vercel.com → "Add New Project"
2. Conecta tu repositorio de GitHub
3. Selecciona la carpeta `frontend/` como root
4. Click en "Deploy"
5. Tu URL: `https://tecnocel.vercel.app` ✅

### 9.3 Deploy del Backend en Railway (GRATIS)
1. Entra a https://railway.app → "New Project"
2. Selecciona "Deploy from GitHub"
3. Elige tu repo, carpeta `backend/`
4. En Variables → agrega tus `.env`
5. Railway genera la URL automáticamente

### 9.4 Dominio personalizado (opcional ~$150 MXN/año)
- Registra `tecnocel.com.mx` en https://akky.mx o https://godaddy.com.mx
- En Vercel: Settings → Domains → agrega tu dominio

### 9.5 Variables de entorno en Railway
```
PORT=3000
FRONTEND_URL=https://tecnocel.vercel.app
SHEETS_ID=xxxxxxxxxxxx
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
```

---

## 10. COMANDOS DE DESARROLLO

```bash
# Backend
cd backend
npm install
npm run dev         # nodemon para desarrollo

# Frontend (solo abrir en browser)
# No necesita servidor: doble clic en index.html
# Para servidor local:
npx serve frontend

# Bot de WhatsApp
cd backend
node src/bot/bot.js
# Escanea el código QR con tu WhatsApp

# Analytics Python
cd analytics
pip install gspread pandas matplotlib oauth2client
python analizar_reparaciones.py
```

---

## 11. CHECKLIST FINAL

- [ ] Videos del taller colocados en `assets/videos/`
- [ ] Logo en `assets/img/logo.png`
- [ ] Número de WhatsApp actualizado en index.html y wa-float
- [ ] `.env` configurado con credenciales reales
- [ ] Google Sheets API habilitada en Google Cloud Console
- [ ] Cuenta de WhatsApp dedicada para el bot escaneada
- [ ] Deploy en Vercel funcionando
- [ ] Backend en Railway corriendo
- [ ] Dominio apuntando a Vercel (si se adquirió)
- [ ] Prueba de formulario de cotización → WhatsApp

---

## 12. NOTAS PARA TU DOCUMENTACIÓN DE ESTADÍAS

Este proyecto implementa:
- **Arquitectura de capas** (Presentación, Servicios, Repositorios, Infraestructura)
- **Principios SOLID** (especialmente S — Responsabilidad Única)
- **Encriptación bcrypt** para datos sensibles
- **Variables de entorno** para no exponer credenciales
- **Middlewares de seguridad** (Helmet, CORS, validación)
- **Patrón Repository** para abstraer el acceso a datos
- **Inyección de dependencias** para módulos desacoplados
- **Bot conversacional** con manejo de estados
- **Analytics con Python** para toma de decisiones

---

*Proyecto generado para estadías profesionales — Tecnocel Laboratorio Celular*
