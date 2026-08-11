/**
 * bot.js — Responsabilidad ÚNICA: mantener la conexión con WhatsApp (Baileys),
 * enrutar los mensajes entrantes al manejador de menú, y avisar
 * automáticamente a los clientes cuando su equipo pasa a estado "listo".
 *
 * Se ejecuta como un proceso separado del backend HTTP:
 *   node src/bot/bot.js   (o  npm run bot)
 *
 * ¿Por qué separado? Porque necesita mantener una conexión abierta todo el
 * tiempo (a diferencia de las rutas HTTP, que responden y terminan). Ambos
 * procesos comparten la misma fuente de verdad: Google Sheets.
 */
require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');

const menuHandler = require('./handlers/menu.handler');
const ordenesService = require('../services/ordenes.service');

const INTERVALO_REVISAR_LISTAS_MS = 30_000; // cada 30 segundos

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../../auth_info'));
  const { version } = await fetchLatestBaileysVersion(); // evita el error 405 por versión desactualizada

  const socket = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }), // apaga el log interno verboso de Baileys
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nEscanea este código QR con WhatsApp (Dispositivos vinculados):\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('Bot conectado a WhatsApp correctamente.');
      iniciarRevisionDeOrdenesListas(socket);
    }
    if (connection === 'close') {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      const razon = lastDisconnect?.error?.message || 'sin detalle';
      console.log('Conexión cerrada. Código:', codigo, '| Razón:', razon);
      if (codigo !== DisconnectReason.loggedOut) {
        console.log('Reconectando en 3 segundos...');
        setTimeout(iniciarBot, 3000);
      } else {
        console.log('Sesión cerrada desde el teléfono. Borra la carpeta auth_info y vuelve a escanear el QR.');
      }
    }
  });

  socket.ev.on('messages.upsert', async ({ messages }) => {
    const mensaje = messages[0];
    if (!mensaje.message || mensaje.key.fromMe) return;

    const telefono = mensaje.key.remoteJid;
    const texto = (mensaje.message.conversation || mensaje.message.extendedTextMessage?.text || '').trim();

    try {
      await menuHandler.handle(socket, telefono, texto);
    } catch (err) {
      console.error('Error atendiendo mensaje:', err.message);
      await socket.sendMessage(telefono, { text: 'Ocurrió un problema atendiendo tu mensaje. Intenta de nuevo en un momento.' });
    }
  });
}

/**
 * Cada cierto tiempo revisa Google Sheets buscando órdenes que el panel ya
 * marcó como "listo" pero que el cliente todavía no sabe. Este es el punto
 * de conexión entre el panel administrativo (proceso HTTP) y el bot
 * (proceso aparte): ambos leen y escriben la misma hoja, sin necesitar
 * comunicarse directamente entre sí.
 */
function iniciarRevisionDeOrdenesListas(socket) {
  setInterval(async () => {
    try {
      const pendientes = await ordenesService.listarPendientesDeNotificar();
      for (const orden of pendientes) {
        const destino = orden.telefono.includes('@') ? orden.telefono : orden.telefono + '@s.whatsapp.net';
        const mensaje =
          'Hola ' + orden.nombre_cliente + ', tu ' + orden.dispositivo +
          ' (' + orden.modelo_especifico + ') ya está listo para recoger en Tecnocel.\n\n' +
          'Horario: Lun-Vie 10am-8pm, Sáb 10am-6pm.';

        await socket.sendMessage(destino, { text: mensaje });
        await ordenesService.marcarComoNotificada(orden.id_orden);
        await new Promise(resolve => setTimeout(resolve, 1500)); // pequeño respiro entre mensajes
      }
    } catch (err) {
      console.error('Error revisando órdenes listas:', err.message);
    }
  }, INTERVALO_REVISAR_LISTAS_MS);
}

iniciarBot();