/**
 * menu.handler.js — Responsabilidad ÚNICA: enrutar cada mensaje entrante al
 * manejador correcto. Principio SOLID (Abierto/Cerrado): para agregar una
 * opción nueva al menú, solo se agrega aquí, sin tocar el resto del bot.
 *
 * Incluye un reconocimiento de intención simple (sin acentos, sin importar
 * mayúsculas, y por palabras clave) para que el bot no dependa de que el
 * cliente escriba exactamente "menu" o el número exacto de una opción.
 */
const cotizarHandler = require('./cotizar.handler');
const estatusHandler = require('./estatus.handler');
const landingParser = require('./landingParser');
const estadoConversacion = require('../estadoConversacion');

const MENU = `Tecnocel - Laboratorio Celular

¿En qué te podemos ayudar?

1 - Cotizar una reparación
2 - Horario y ubicación
3 - Precios orientativos
4 - Hablar con un técnico
5 - Consultar el estatus de tu equipo

Responde con el número de la opción, o simplemente cuéntanos qué le pasa a tu equipo.`;

const INFO_HORARIO = `Horario y ubicación

Lunes a Viernes: 10:00 am - 8:00 pm
Sábado: 10:00 am - 6:00 pm
Domingo: Cerrado

Calle Manuel Saldaña sur #16, Chiautempan Centro, Tlaxcala.`;

const INFO_PRECIOS = `Precios orientativos

Pantalla Samsung: desde $180
Pantalla iPhone: desde $250
Pantalla Motorola/Xiaomi: desde $180
Consolas (limpieza): desde $300

El precio exacto depende del modelo. Escribe 1 para cotizar tu caso específico.`;

/** Quita acentos y pasa a minúsculas, para que "Menú", "MENU" y "menu" se traten igual. */
function normalizar(texto) {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim();
}

const SALUDOS = ['hola', 'menu', 'inicio', 'buenas', 'hi', 'buen dia', 'buenas tardes', 'buenas noches'];
const PALABRAS_CANCELAR = ['cancelar', 'salir', 'detener', 'ya no'];

// Palabras clave que detectan la intención aunque el cliente no use el menú numérico
const PALABRAS_COTIZAR = ['pantalla', 'roto', 'rota', 'quebro', 'quebrada', 'no prende', 'no enciende', 'bateria', 'cotiz', 'reparar', 'reparacion', 'se cayo', 'no carga'];
const PALABRAS_HORARIO = ['horario', 'ubicacion', 'direccion', 'donde estan', 'a que hora'];
const PALABRAS_PRECIO = ['precio', 'cuanto cuesta', 'costo', 'cuanto sale'];
const PALABRAS_TECNICO = ['tecnico', 'persona', 'humano', 'asesor'];
const PALABRAS_ESTATUS = ['estatus', 'status', 'ya esta listo', 'como va', 'como va mi', 'esta listo', 'ya termino', 'ya reviso'];

function contieneAlguna(texto, lista) {
  return lista.some(palabra => texto.includes(palabra));
}

async function handle(sock, telefono, texto) {
  const enviar = (mensaje) => sock.sendMessage(telefono, { text: mensaje });

  // Si es el mensaje ya estructurado que manda el formulario de la landing page,
  // creamos la orden directo — sin repetirle al cliente lo que ya escribió ahí.
  const datosDeLaPagina = landingParser.intentarParsear(texto);
  if (datosDeLaPagina) {
    estadoConversacion.terminar(telefono); // por si acaso venía a medias de otra cosa
    return cotizarHandler.crearDesdeFormularioWeb(sock, telefono, datosDeLaPagina, enviar);
  }

  const normalizado = normalizar(texto);

  // Permite cancelar una cotización a medias en cualquier momento
  if (contieneAlguna(normalizado, PALABRAS_CANCELAR)) {
    estadoConversacion.terminar(telefono);
    return enviar('Listo, cancelamos eso. Escribe menu cuando quieras empezar de nuevo.');
  }

  const estado = estadoConversacion.obtener(telefono);
  if (estado) {
    return cotizarHandler.continuar(sock, telefono, texto, enviar);
  }

  if (!normalizado || SALUDOS.includes(normalizado)) {
    return enviar(MENU);
  }
  if (normalizado === '1' || contieneAlguna(normalizado, PALABRAS_COTIZAR)) {
    return cotizarHandler.iniciar(sock, telefono, enviar);
  }
  if (normalizado === '2' || contieneAlguna(normalizado, PALABRAS_HORARIO)) {
    return enviar(INFO_HORARIO);
  }
  if (normalizado === '3' || contieneAlguna(normalizado, PALABRAS_PRECIO)) {
    return enviar(INFO_PRECIOS);
  }
  if (normalizado === '4' || contieneAlguna(normalizado, PALABRAS_TECNICO)) {
    return enviar('En un momento te atiende un técnico directamente. Gracias por tu paciencia.');
  }
  if (normalizado === '5' || contieneAlguna(normalizado, PALABRAS_ESTATUS)) {
    return estatusHandler.consultar(sock, telefono, enviar);
  }

  // En vez de un "no entendí" seco, mostramos el menú de nuevo para no dejar al cliente atorado
  return enviar('No estoy seguro de haber entendido. Aquí tienes las opciones de nuevo:\n\n' + MENU);
}

module.exports = { handle };