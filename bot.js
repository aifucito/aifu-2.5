// bot.js
require('dotenv').config(); // opcional, si usas .env local
const { Telegraf, Markup } = require('telegraf');
const Pack = require('./Pack.js');
const fs = require('fs-extra');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // la URL de tu Render
if (!BOT_TOKEN || !WEBHOOK_URL) {
    console.error('Falta BOT_TOKEN o WEBHOOK_URL en variables de entorno');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const estados = {};
const VIP_IDS = []; // tus IDs VIP

// ---- START ----
bot.start(ctx => {
    const isVIP = VIP_IDS.includes(ctx.from.id);
    estados[ctx.from.id] = { paso: 'inicio', vip: isVIP };

    ctx.reply(
        `Hola ${ctx.from.first_name}, soy Aifucito, tu asistente ufológico.\n` +
        `${isVIP ? 'Gracias por ser VIP. 👽' : 'Para acceder a más funciones, hacete VIP!'}\n` +
        `¿Querés hacer un reporte de un avistamiento?`,
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

// ---- PASO DE TEXTO ----
bot.on('text', async ctx => {
    const userId = ctx.from.id;
    const estado = estados[userId];
    if (!estado) return;

    switch(estado.paso){
        case 'pais':
            estado.pais = ctx.message.text;
            estado.paso = 'ciudad';
            ctx.reply('Ahora, ¿en qué ciudad o barrio ocurrió el evento?');
            break;
        case 'ciudad':
            estado.ciudad = ctx.message.text;
            estado.paso = 'descripcion';
            ctx.reply('Describí brevemente lo que viste:');
            break;
        case 'descripcion':
            estado.descripcion = ctx.message.text;
            estado.paso = 'analisis';
            ctx.reply(
                'Algunos detalles más para analizar correctamente:\n' +
                '- ¿Duración del avistamiento?\n' +
                '- ¿Movimiento del objeto?\n' +
                '- ¿Color, forma o luces observadas?'
            );
            break;
        case 'analisis':
            estado.analisis = ctx.message.text;
            estado.paso = 'intensidad';
            ctx.reply('Qué intensidad tuvo el avistamiento?', Markup.inlineKeyboard([
                Markup.button.callback('Verde', 'verde'),
                Markup.button.callback('Amarillo', 'amarillo'),
                Markup.button.callback('Rojo', 'rojo')
            ]));
            break;
        case 'ubicacion_manual':
            const parts = ctx.message.text.split(',');
            if(parts.length === 2){
                estado.gps = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
            } else {
                estado.ubicacionManual = ctx.message.text;
            }
            confirmarReporte(ctx);
            break;
    }
});

// ---- SUBIDA DE ARCHIVOS ----
bot.on('document', async ctx => {
    const estado = estados[ctx.from.id];
    if (!estado) return;

    const file = await ctx.telegram.getFile(ctx.message.document.file_id);
    const link = await ctx.telegram.getFileLink(file.file_id);

    estado.archivo = { file_name: ctx.message.document.file_name, url: link };
    ctx.reply('Archivo recibido correctamente. Continuamos con la ubicación.');
});

// ---- INTENSIDAD ----
bot.action(/verde|amarillo|rojo/, ctx => {
    const estado = estados[ctx.from.id];
    estado.intensidad = ctx.match[0];
    estado.paso = 'ubicacion';
    ctx.reply('Querés dar la ubicación automática (GPS) o manual?', Markup.inlineKeyboard([
        Markup.button.callback('GPS', 'gps'),
        Markup.button.callback('Manual', 'manual')
    ]));
});

// ---- UBICACIÓN ----
bot.action('gps', ctx => {
    const estado = estados[ctx.from.id];
    estado.ubicacionTipo = 'gps';
    estado.gps = { lat: 0.0, lon: 0.0 }; // coordenadas de prueba
    confirmarReporte(ctx);
});

bot.action('manual', ctx => {
    const estado = estados[ctx.from.id];
    estado.paso = 'ubicacion_manual';
    ctx.reply('Por favor escribí las coordenadas o descripción de la ubicación del evento (lat, lon o barrio):');
});

// ---- CONFIRMAR REPORTE ----
function confirmarReporte(ctx){
    const estado = estados[ctx.from.id];
    const resumen = `Resumen del reporte:
País: ${estado.pais}
Ciudad: ${estado.ciudad}
Descripción: ${estado.descripcion}
Detalles analíticos: ${estado.analisis || 'No especificados'}
Intensidad: ${estado.intensidad}
Ubicación: ${estado.gps ? `${estado.gps.lat},${estado.gps.lon}` : estado.ubicacionManual || 'No especificada'}
Archivo: ${estado.archivo ? estado.archivo.file_name : 'No subido'}
`;
    ctx.reply(resumen, Markup.inlineKeyboard([
        Markup.button.callback('Confirmar', 'confirmar_reporte'),
        Markup.button.callback('Editar', 'editar_reporte')
    ]));
}

bot.action('confirmar_reporte', async ctx => {
    const estado = estados[ctx.from.id];
    const reporte = {
        usuario: ctx.from.id,
        nombre: ctx.from.first_name,
        pais: estado.pais,
        ciudad: estado.ciudad,
        gps: estado.gps || null,
        descripcion: estado.descripcion,
        analisis: estado.analisis || '',
        intensidad: estado.intensidad,
        fecha: new Date().toISOString().split('T')[0],
        vip: estado.vip,
        archivos: estado.archivo ? [estado.archivo] : []
    };

    Pack.guardarReporte(reporte);
    ctx.reply('Tu reporte fue guardado correctamente! Gracias por colaborar con AIFU.');
    delete estados[ctx.from.id];
});

bot.action('editar_reporte', ctx => {
    ctx.reply('Se reiniciará el reporte. Escribí /start para comenzar de nuevo.');
    delete estados[ctx.from.id];
});

// ---- COMANDOS EXTRA ----
bot.command('canales', ctx => {
    ctx.reply('Canales disponibles:\n' +
        'Aifu Radar Cono Sur: https://t.me/+u9rgW049fowxMzcx\n' +
        'AIFU Otros Países: https://t.me/+xLRcZqw06ZA3YTMx\n' +
        'AIFU CL: https://t.me/+x_GM9r-Rb4wyZDQx\n' +
        'AIFU UY: https://t.me/+JRfTYgzQafYwNmZh\n' +
        'AIFU AR: https://t.me/+jzzJi-2HPJk3OGUx');
});

// ---- EXPRESS + WEBHOOK ----
const app = express();
app.use(bot.webhookCallback('/aifu-webhook')); // ruta única
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}, webhook: ${WEBHOOK_URL}/aifu-webhook`);
});
bot.telegram.setWebhook(`${WEBHOOK_URL}/aifu-webhook`);