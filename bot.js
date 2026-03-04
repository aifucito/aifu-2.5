// ================= BOT AIFUCITO 4.3 COMPLETO =================
console.log("TOKEN CARGADO:", process.env.BOT_TOKEN ? "SI" : "NO");

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ========= CONFIG =========
const ADMIN_ID = 000000000; // TU ID
const FECHA_CORTE_FUNDADOR = new Date('2026-04-01');
const CANALES = {
  radar: '@aifu_radar',
  uy: '@aifu_uy',
  ar: '@aifu_ar',
  cl: '@aifu_cl'
};
const GRUPOS = {
  uy: -1001234567890,
  ar: -1002345678901,
  cl: -1003456789012,
  otros: -1004567890123
};

// ========= DATA =========
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const usuariosFile = path.join(dataDir, 'usuarios.json');
const reportesFile = path.join(dataDir, 'reportes.json');

let usuarios = fs.existsSync(usuariosFile) ? JSON.parse(fs.readFileSync(usuariosFile)) : {};
let reportes = fs.existsSync(reportesFile) ? JSON.parse(fs.readFileSync(reportesFile)) : [];
let reportesPendientes = [];

// Carpeta uploads para archivos de usuarios
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function guardarDatos() {
  fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
  fs.writeFileSync(reportesFile, JSON.stringify(reportes, null, 2));
}

// ========= VIP =========
function determinarPlan() {
  if (new Date() < FECHA_CORTE_FUNDADOR) return { plan: 'fundador', precio: 1.5 };
  return { plan: 'estandar', precio: 3 };
}

function esVIP(userId) {
  if (!usuarios[userId] || !usuarios[userId].vip) return false;
  const hoy = new Date();
  const vence = new Date(usuarios[userId].fechaRenovacion);
  if (hoy > vence) {
    usuarios[userId].vip = false;
    guardarDatos();
    return false;
  }
  return true;
}

function activarVIP(userId, metodo) {
  const hoy = new Date();
  const vence = new Date();
  vence.setMonth(vence.getMonth() + 1);
  const { plan, precio } = determinarPlan();
  usuarios[userId] = { vip: true, plan, precio, metodoPago: metodo, fechaInicio: hoy.toISOString(), fechaRenovacion: vence.toISOString() };
  guardarDatos();
}

// ========= MENÚ =========
bot.start(ctx => {
  ctx.reply(
`👽 AIFUCITO 4.3
Sistema Oficial RED AIFU`,
    Markup.keyboard([
      ['Reportar', 'Mi estado'],
      ['Hazte VIP', 'Red AIFU'],
      ['Mapa de calor']
    ]).resize()
  );
});

// ========= RED AIFU =========
bot.hears('Red AIFU', ctx => {
  ctx.reply(
    "Canales oficiales:",
    Markup.inlineKeyboard([
      [Markup.button.url("Radar Cono Sur", "https://t.me/+u9rgW049fowxMzcx")],
      [Markup.button.url("AIFU Uruguay", "https://t.me/+JRfTYgzQafYwNmZh")],
      [Markup.button.url("AIFU Argentina", "https://t.me/+jzzJi-2HPJk3OGUx")],
      [Markup.button.url("AIFU Chile", "https://t.me/+x_GM9r-Rb4wyZDQx")],
      [Markup.button.url("AIFU Otros Países", "https://t.me/+xLRcZqw06ZA3YTMx")]
    ])
  );
});

// ========= ESTADO =========
bot.hears('Mi estado', ctx => {
  const id = ctx.from.id;
  if (esVIP(id)) ctx.reply(`⭐ VIP activo.\nRenovación: ${usuarios[id].fechaRenovacion}`);
  else ctx.reply("Cuenta estándar activa.");
});

// ========= INFO VIP =========
bot.hears('Hazte VIP', ctx => {
  ctx.reply(
`⭐ Membresía VIP AIFU (fase de prueba)

Todos los usuarios ahora tienen acceso completo a funcionalidades VIP:
• Acceso completo Cono Sur
• Multimedia global
• Radar prioritario
• Alertas avanzadas

⚠️ Activación de pagos deshabilitada temporalmente para testing.`
  );
});

// ========= REPORTE =========
let sesiones = {};
let reportesRecientes = {}; // { 'uy': [timestamp1, ...] }

// Función de geocoding OpenStreetMap
async function geocode(ciudad, pais) {
  try {
    const query = encodeURIComponent(`${ciudad}, ${pais}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error('Error geocoding:', e);
  }
  return { lat: -32.5, lng: -55.9 }; // fallback
}

// Detectar reportes dudosos
function esReporteDudoso(reporte) {
  const spam = !reporte.mensaje || reporte.mensaje.length < 5;
  const violento = /(matar|odio|explosión)/i.test(reporte.mensaje);
  return spam || violento;
}

function agregarReportePendiente(reporte) {
  reportesPendientes.push(reporte);
}

bot.hears('Reportar', ctx => {
  sesiones[ctx.from.id] = { estado: 'ubicacion' };
  ctx.reply("Indica ciudad y país (ej: Montevideo, uy).");
});

// ========= PERSONALIDAD =========
const frasesAmistosas = [
  "¡Hola, explorador de lo desconocido! 👽",
  "¡Qué gusto verte de nuevo en AIFU! 🌌",
  "Recuerda: los fenómenos no esperan… pero tu café sí ☕",
  "Eres uno de nuestros curiosos más dedicados, ¡gracias por estar aquí! ⭐"
];

const frasesBromas = [
  "Si veo un OVNI y no me avisás, me pongo celoso 👀",
  "Cuidado con los extraterrestres, algunos dicen que bailan salsa 💃🛸",
  "Si fueras un alienígena, serías de los VIP 😎"
];

const frasesFirmes = [
  "Recuerda reportar solo fenómenos reales, sin spam ni palabras violentas ⚠️",
  "Tu reporte fue marcado para revisión, mantenemos la calidad AIFU 💼",
  "No toleramos lenguaje ofensivo. Mantén la cordialidad 🛡"
];

function saludoAleatorio() {
  const r = Math.random();
  if (r < 0.5) return frasesAmistosas[Math.floor(Math.random() * frasesAmistosas.length)];
  else return frasesBromas[Math.floor(Math.random() * frasesBromas.length)];
}

function mensajeVIP(userId) {
  if (!esVIP(userId)) return null;
  const vipMsg = [
    "⭐ Gracias por ser VIP, eres parte de nuestra élite de exploradores.",
    "¡Tu radar VIP está activo! Mantente atento a los fenómenos.",
    "Como VIP, recibes alertas antes que todos. No abuses de tu poder 😜"
  ];
  return vipMsg[Math.floor(Math.random() * vipMsg.length)];
}

// ========= ESCUCHA MENSAJES =========
bot.on('text', async ctx => {
  const id = ctx.from.id;

  if (sesiones[id]) {
    const sesion = sesiones[id];
    if (sesion.estado === 'ubicacion') {
      sesion.ubicacion = ctx.message.text;
      sesion.estado = 'mensaje';
      ctx.reply("Describe el fenómeno.");
      return;
    }
    if (sesion.estado === 'mensaje') {
      const partes = sesion.ubicacion.split(',');
      const ciudad = partes[0].trim();
      const pais = partes[1] ? partes[1].trim().toLowerCase() : 'otros';

      const { lat, lng } = await geocode(ciudad, pais);

      const nuevoReporte = {
        id: Date.now(),
        usuario: id,
        fecha: new Date().toISOString(),
        mensaje: ctx.message.text,
        ubicacion: ciudad,
        pais: pais,
        categoria: "luz",
        vip: true,
        lat,
        lng
      };

      // Almacenamiento reciente para alertas
      if (!reportesRecientes[pais]) reportesRecientes[pais] = [];
      reportesRecientes[pais].push(Date.now());
      reportesRecientes[pais] = reportesRecientes[pais].filter(ts => Date.now() - ts < 45*60*1000);

      // Envío a grupo correspondiente
      const grupoDestino = GRUPOS[pais] || GRUPOS.otros;
      bot.telegram.sendMessage(grupoDestino,
        `📡 Nuevo reporte\nUbicación: ${ciudad}, ${pais.toUpperCase()}\nFecha: ${nuevoReporte.fecha}\nCategoría: ${nuevoReporte.categoria}\n⭐ Usuario VIP`
      );

      // Alerta si >=5 reportes recientes
      if (reportesRecientes[pais].length >= 5) {
        bot.telegram.sendMessage(grupoDestino,
          `⚠️ Alerta: 5 reportes recientes de fenómenos en ${ciudad}, ${pais.toUpperCase()} en los últimos 45 minutos.`
        );
      }

      if (esReporteDudoso(nuevoReporte)) {
        agregarReportePendiente(nuevoReporte);
        ctx.reply("⚠️ Tu reporte fue marcado para revisión por el equipo de AIFU.");
      } else {
        reportes.push(nuevoReporte);
        guardarDatos();
        publicarReporte(nuevoReporte);
        ctx.reply("Reporte registrado correctamente.");
      }

      delete sesiones[id];
      return;
    }
  }

  const texto = ctx.message.text.toLowerCase();
  if (texto.includes('hola') || texto.includes('buenos')) {
    let msg = saludoAleatorio();
    const vipMsg = mensajeVIP(id);
    if (vipMsg) msg += `\n\n${vipMsg}`;
    ctx.reply(msg);
    return;
  }
  if (texto.includes('gracias') || texto.includes('muy bien')) {
    ctx.reply("¡De nada! Recuerda que los cielos siempre tienen secretos 🌌");
    return;
  }
  if (texto.includes('problema') || texto.includes('error')) {
    ctx.reply("Tranquilo, amigo. Estamos aquí para ayudarte. Si es sobre un reporte, ¡hazlo bien detallado! 🛠");
    return;
  }
  if (texto.length < 3 || /(spam|odio|matar|explosión)/i.test(texto)) {
    ctx.reply(frasesFirmes[Math.floor(Math.random() * frasesFirmes.length)]);
    return;
  }

  ctx.reply("¡Interesante! 🌠 ¿Quieres reportar un fenómeno o ver el mapa de calor?");
});

// ========= SUBIDA DE ARCHIVOS =========
bot.on('document', async ctx => {
  const id = ctx.from.id;
  const fileId = ctx.message.document.file_id;
  const fileName = ctx.message.document.file_name;
  const filePath = path.join(uploadsDir, `${Date.now()}_${fileName}`);

  try {
    const link = await ctx.telegram.getFileLink(fileId);
    const res = await fetch(link);
    const buffer = await res.buffer();
    fs.writeFileSync(filePath, buffer);
    ctx.reply(`Archivo recibido y guardado: ${fileName}`);
  } catch (e) {
    console.error(e);
    ctx.reply("Error guardando archivo.");
  }
});

// ========= PUBLICACIÓN =========
function publicarReporte(reporte) {
  let texto = `📡 Nuevo reporte
Ubicación: ${reporte.ubicacion}
Fecha: ${reporte.fecha}
Categoría: ${reporte.categoria}`;
  if (reporte.vip) texto += "\n⭐ Usuario VIP";
  bot.telegram.sendMessage(CANALES.radar, texto);
}

// ========= MAPA DE CALOR =========
bot.hears('Mapa de calor', ctx => {
  ctx.reply(
    "🌐 Abre el mapa de calor actualizado:",
    Markup.inlineKeyboard([
      [Markup.button.url("Ver mapa de calor", "https://<tu-servicio>.onrender.com/mapa/mapa.html")]
    ])
  );
});

// ========= EXPRESS + ENDPOINTS =========
const app = express();
const PORT = process.env.PORT || 3000;

app.use('/archivos', express.static(uploadsDir));
app.use('/mapa', express.static(path.join(__dirname, 'mapa')));

app.get('/', (req,res) => res.send('AIFUCITO Web Service activo'));

app.get('/api/reportes', (req,res) => {
  const visibles = reportes.map(r => ({
    id: r.id,
    mensaje: r.mensaje,
    ubicacion: r.ubicacion,
    pais: r.pais,
    lat: r.lat,
    lng: r.lng
  }));
  res.json(visibles);
});

// ========= ADMIN =========
const ADMIN_PRIVADOS = [ADMIN_ID];

bot.command('pendientes', ctx => {
  if (!ADMIN_PRIVADOS.includes(ctx.from.id)) return;
  if (reportesPendientes.length === 0) return ctx.reply("✅ No hay reportes pendientes.");
  let texto = "📂 Reportes pendientes:\n\n";
  reportesPendientes.forEach((r,i)=>{
    texto += `${i+1}. Usuario: ${r.usuario}, Fecha: ${r.fecha}, Mensaje: ${r.mensaje || 'Sin texto'}, Ubicación: ${r.ubicacion || 'Desconocida'}\n\n`;
  });
  ctx.reply(texto);
});

bot.command('validar', ctx => {
  if (!ADMIN_PRIVADOS.includes(ctx.from.id)) return;
  const args = ctx.message.text.split(' ');
  const index = parseInt(args[1])-1;
  if (isNaN(index) || !reportesPendientes[index]) return ctx.reply("❌ Índice inválido.");
  const reporte = reportesPendientes.splice(index,1)[0];
  reportes.push(reporte);
  guardarDatos();
  publicarReporte(reporte);
  ctx.reply(`✅ Reporte validado y publicado correctamente (ID: ${reporte.id})`);
});

bot.command('eliminar', ctx => {
  if (!ADMIN_PRIVADOS.includes(ctx.from.id)) return;
  const args = ctx.message.text.split(' ');
  const index = parseInt(args[1])-1;
  if (isNaN(index) || !reportesPendientes[index]) return ctx.reply("❌ Índice inválido.");
  reportesPendientes.splice(index,1);
  ctx.reply("🗑 Reporte eliminado correctamente.");
});

bot.command('activarvip', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  const id = ctx.message.text.split(' ')[1];
  const metodo = ctx.message.text.split(' ')[2] || 'manual';
  activarVIP(id, metodo);
  ctx.reply("VIP activado correctamente.");
});

bot.command('panel', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply(`Panel Admin:
Usuarios: ${Object.keys(usuarios).length}
Reportes totales: ${reportes.length}`);
});

// ========= LANZAR SERVIDOR Y BOT =========
app.listen(PORT, () => console.log(`Servidor web escuchando en puerto ${PORT}`));
bot.launch();
console.log("AIFUCITO 4.3 DEFINITIVO + ALERTAS activo");
