console.log("TOKEN CARGADO:", process.env.BOT_TOKEN ? "SI" : "NO");
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const express = require('express'); // <-- agregado para servidor HTTP

const bot = new Telegraf(process.env.BOT_TOKEN);

// ========= CONFIG =========

const ADMIN_ID = 000000000; // ← TU ID
const FECHA_CORTE_FUNDADOR = new Date('2026-04-01');

const CANALES = {
  radar: '@aifu_radar',
  uy: '@aifu_uy',
  ar: '@aifu_ar',
  cl: '@aifu_cl'
};

// ========= DATA =========

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const usuariosFile = path.join(dataDir, 'usuarios.json');
const reportesFile = path.join(dataDir, 'reportes.json');

let usuarios = fs.existsSync(usuariosFile)
  ? JSON.parse(fs.readFileSync(usuariosFile))
  : {};

let reportes = fs.existsSync(reportesFile)
  ? JSON.parse(fs.readFileSync(reportesFile))
  : [];

function guardarDatos() {
  fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
  fs.writeFileSync(reportesFile, JSON.stringify(reportes, null, 2));
}

// ========= VIP =========

function determinarPlan() {
  if (new Date() < FECHA_CORTE_FUNDADOR) {
    return { plan: 'fundador', precio: 1.5 };
  } else {
    return { plan: 'estandar', precio: 3 };
  }
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

  usuarios[userId] = {
    vip: true,
    plan,
    precio,
    metodoPago: metodo,
    fechaInicio: hoy.toISOString(),
    fechaRenovacion: vence.toISOString()
  };

  guardarDatos();
}

// ========= MENÚ =========

bot.start(ctx => {
  ctx.reply(
`👽 AIFUCITO 4.2
Sistema Oficial RED AIFU`,
    Markup.keyboard([
      ['Reportar'],
      ['Mi estado'],
      ['Hazte VIP'],
      ['Red AIFU']
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

  if (esVIP(id)) {
    ctx.reply(`⭐ VIP activo.
Renovación: ${usuarios[id].fechaRenovacion}`);
  } else {
    ctx.reply("Cuenta estándar activa.");
  }
});

// ========= INFO VIP =========

bot.hears('Hazte VIP', ctx => {
  const { plan, precio } = determinarPlan();

  ctx.reply(
`⭐ Membresía VIP AIFU

Plan actual: ${plan.toUpperCase()}
Precio mensual: USD ${precio}

Beneficios:
• Acceso completo Cono Sur
• Multimedia global
• Radar prioritario
• Alertas avanzadas

Métodos:
PayPal
Mercado Pago
Prex
MiDinero

Envía comprobante y espera activación.`
  );
});

// ========= REPORTE =========

let sesiones = {};

bot.hears('Reportar', ctx => {
  sesiones[ctx.from.id] = { estado: 'ubicacion' };
  ctx.reply("Indica ciudad y país.");
});

bot.on('text', ctx => {
  const id = ctx.from.id;
  if (!sesiones[id]) return;

  const sesion = sesiones[id];

  if (sesion.estado === 'ubicacion') {
    sesion.ubicacion = ctx.message.text;
    sesion.estado = 'mensaje';
    ctx.reply("Describe el fenómeno.");
    return;
  }

  if (sesion.estado === 'mensaje') {

    const nuevoReporte = {
      id: Date.now(),
      usuario: id,
      fecha: new Date().toISOString(),
      mensaje: ctx.message.text,
      categoria: "luz",
      ubicacion: sesion.ubicacion,
      multimedia: [],
      vip: esVIP(id)
    };

    reportes.push(nuevoReporte);
    guardarDatos();

    publicarReporte(nuevoReporte);

    delete sesiones[id];
    ctx.reply("Reporte registrado correctamente.");
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

// ========= ADMIN =========

bot.command('activarvip', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;

  const id = ctx.message.text.split(' ')[1];
  const metodo = ctx.message.text.split(' ')[2] || 'manual';

  activarVIP(id, metodo);

  ctx.reply("VIP activado correctamente.");
});

bot.command('panel', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply(
`Panel Admin:
Usuarios: ${Object.keys(usuarios).length}
Reportes totales: ${reportes.length}`
  );
});

// ========= LANZAMIENTO =========

// Servidor HTTP para Render (puerto obligatorio)
const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos (mapas, multimedia)
app.use('/archivos', express.static(path.join(__dirname, 'uploads')));

// Endpoint de prueba
app.get('/', (req, res) => res.send('AIFUCITO Web Service activo'));

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor web escuchando en puerto ${PORT}`));

// Lanzamiento del bot Telegram
bot.launch();
console.log("AIFUCITO 4.2 activo");
