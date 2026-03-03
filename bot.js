require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const Pack = require('./Pack.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !WEBHOOK_URL) {
    console.error('Falta BOT_TOKEN o WEBHOOK_URL en variables de entorno');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const estados = {};
const VIP_IDS = [];

// ------------------- BOT -------------------

// START
bot.start(ctx => {
    const isVIP = VIP_IDS.includes(ctx.from.id);
    estados[ctx.from.id] = { paso: 'inicio', vip: isVIP };
    ctx.reply(`Hola ${ctx.from.first_name}, soy Aifucito.\n${isVIP ? 'VIP 👽' : 'Hacete VIP!'}\n¿Querés hacer un reporte?`,
        Markup.inlineKeyboard([
            Markup.button.callback('Sí', 'reporte_si'),
            Markup.button.callback('No', 'reporte_no')
        ])
    );
});

bot.action('reporte_no', ctx => {
    ctx.reply('Ok, cualquier cosa me escribís y hablamos de los avistamientos.\nSi querés ir a un canal, escribí /canales');
});

bot.action('reporte_si', ctx => {
    const estado = estados[ctx.from.id];
    estado.paso = 'pais';
    ctx.reply('Primero, ¿de qué país estás reportando el evento?');
});

// Resto de tu código de manejo de texto, archivos, intensidad, ubicación, confirmación...
// Copia tal cual tu código actual, sin cambios, desde "bot.on('text', ...)" hasta "bot.launch()".

// ------------------- EXPRESS -------------------
const app = express();
app.use(express.json());

app.use(bot.webhookCallback('/bot'));

app.get('/', (req, res) => res.send('AIFU-bot funcionando 🚀'));

bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`).then(() => {
    console.log('Webhook configurado correctamente en', `${WEBHOOK_URL}/bot`);
});

app.listen(PORT, () => console.log(`Servidor Express corriendo en puerto ${PORT}`));