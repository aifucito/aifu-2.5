const { Telegraf, Markup } = require('telegraf');
const Pack = require('./Pack.js');
const BOT_TOKEN = 'TU_TOKEN_AQUI'; // reemplazá con tu token real
const bot = new Telegraf(BOT_TOKEN);
const estados = {};

bot.start(ctx => {
    estados[ctx.from.id] = { paso: 'inicio' };
    ctx.reply(
        `Hola ${ctx.from.first_name}, soy Aifucito, tu asistente ufológico.\n¿Querés hacer un reporte de un avistamiento?`,
        Markup.inlineKeyboard([
            Markup.button.callback('Sí', 'reporte_si'),
            Markup.button.callback('No', 'reporte_no')
        ])
    );
});

bot.action('reporte_no', ctx => ctx.reply('Ok, cualquier cosa me escribís y hablamos de los avistamientos.'));
bot.action('reporte_si', ctx => {
    estados[ctx.from.id].paso = 'pais';
    ctx.reply('Primero, de qué país estás reportando el evento?');
});

// Manejo de texto según paso
bot.on('text', ctx => {
    const userId = ctx.from.id;
    const estado = estados[userId];
    if (!estado) return;

    switch(estado.paso){
        case 'pais':
            estado.pais = ctx.message.text;
            estado.paso = 'ciudad';
            ctx.reply('Ahora, en qué ciudad o barrio ocurrió el evento?');
            break;
        case 'ciudad':
            estado.ciudad = ctx.message.text;
            estado.paso = 'descripcion';
            ctx.reply('Describí brevemente lo que viste:');
            break;
        case 'descripcion':
            estado.descripcion = ctx.message.text;
            estado.paso = 'intensidad';
            ctx.reply('Qué intensidad tuvo el avistamiento?', Markup.inlineKeyboard([
                Markup.button.callback('Verde', 'verde'),
                Markup.button.callback('Amarillo', 'amarillo'),
                Markup.button.callback('Rojo', 'rojo')
            ]));
            break;
        case 'ubicacion_manual':
            const parts = ctx.message.text.split(',');
            if (parts.length === 2) estado.gps = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
            else estado.ubicacionManual = ctx.message.text;
            confirmarReporte(ctx);
            break;
    }
});

// Intensidad
bot.action(/verde|amarillo|rojo/, ctx => {
    const estado = estados[ctx.from.id];
    estado.intensidad = ctx.match[0];
    estado.paso = 'confirmar';
    ctx.reply('Querés dar la ubicación automática (GPS) o manual?', Markup.inlineKeyboard([
        Markup.button.callback('GPS', 'gps'),
        Markup.button.callback('Manual', 'manual')
    ]));
});

// Ubicación
bot.action('gps', ctx => {
    const estado = estados[ctx.from.id];
    estado.ubicacionTipo = 'gps';
    estado.gps = { lat: 0.0, lon: 0.0 }; // ejemplo de prueba
    confirmarReporte(ctx);
});
bot.action('manual', ctx => {
    estados[ctx.from.id].paso = 'ubicacion_manual';
    ctx.reply('Por favor, escribí las coordenadas o dirección del evento (lat, lon o descripción):');
});

// Confirmar reporte
function confirmarReporte(ctx){
    const estado = estados[ctx.from.id];
    const resumen = `Resumen del reporte:
País: ${estado.pais}
Ciudad: ${estado.ciudad}
Descripción: ${estado.descripcion}
Intensidad: ${estado.intensidad}
Ubicación: ${estado.gps ? `${estado.gps.lat},${estado.gps.lon}` : estado.ubicacionManual || 'No especificada'}
`;
    ctx.reply(resumen, Markup.inlineKeyboard([
        Markup.button.callback('Confirmar', 'confirmar_reporte'),
        Markup.button.callback('Editar', 'editar_reporte')
    ]));
}

// Confirmar o editar
bot.action('confirmar_reporte', ctx => {
    const estado = estados[ctx.from.id];
    const reporte = {
        usuario: ctx.from.id,
        nombre: ctx.from.first_name,
        pais: estado.pais,
        ciudad: estado.ciudad,
        gps: estado.gps,
        descripcion: estado.descripcion,
        intensidad: estado.intensidad,
        fecha: new Date().toISOString().split('T')[0],
        vip: false,
        archivos: []
    };
    Pack.guardarReporte(reporte);
    ctx.reply('Tu reporte fue guardado correctamente! Gracias por colaborar con AIFU.');
    delete estados[ctx.from.id];
});
bot.action('editar_reporte', ctx => {
    ctx.reply('Se reiniciará el reporte. Escribí /start para volver a comenzar.');
    delete estados[ctx.from.id];
});

bot.launch().then(()=>console.log('Bot iniciado correctamente'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));