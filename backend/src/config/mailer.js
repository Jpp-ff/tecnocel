/**
 * mailer.js — Responsabilidad ÚNICA: configurar el transportador de correo.
 * Usa Gmail SMTP con una "contraseña de aplicación" (App Password), gratis,
 * sin necesidad de un servicio de correo transaccional de paga.
 *
 * Cómo obtener la contraseña de aplicación:
 * 1. Entra a https://myaccount.google.com/security
 * 2. Activa la verificación en dos pasos (si no la tienes activa)
 * 3. Busca "Contraseñas de aplicaciones" y genera una nueva
 * 4. Copia esa contraseña de 16 caracteres a EMAIL_APP_PASSWORD en tu .env
 *    (NO uses tu contraseña normal de Gmail, esta es distinta y específica)
 */
const nodemailer = require('nodemailer');

function crearTransportador() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

async function enviarCorreoRecuperacion(destinatario, nombre, enlaceReset) {
  const transportador = crearTransportador();
  await transportador.sendMail({
    from: `"Tecnocel Laboratorio Celular" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recupera tu contraseña — Panel Tecnocel',
    html: `
      <div style="font-family:Arial,sans-serif;background:#080808;color:#f5f5f5;padding:32px;border-radius:8px;">
        <h2 style="color:#e91e8c;margin-bottom:16px;">Recuperación de contraseña</h2>
        <p>Hola ${nombre},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña del Panel de Tecnocel. Este enlace es válido durante 30 minutos:</p>
        <p style="margin:24px 0;">
          <a href="${enlaceReset}" style="background:#e91e8c;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">Restablecer mi contraseña</a>
        </p>
        <p style="font-size:13px;color:#888;">Si tú no solicitaste este cambio, ignora este correo y tu contraseña seguirá siendo la misma.</p>
      </div>
    `,
  });
}

module.exports = { crearTransportador, enviarCorreoRecuperacion };
