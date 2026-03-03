
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const bot = new Telegraf('8701174108:AAFgEE-uSZlDvrTNm_QIeDIINqmnCzQIOCM');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

let sesiones = {};

bot.start(ctx => {
    ctx.reply(
`¡Hola! Soy Aifucito, tu asistente de reportes de fenómenos en Uruguay y Conosur.
Actualmente la plataforma es GRATIS por la primera semana.
Botones:
- Reportar un avistamiento
- Conocer RED AIFU (Conosur)
- Ver reportes del último año`
    );
});

bot.command('reportar', ctx => {
    const id = ctx.from.id;
    sesiones[id] = { estado: 'inicio', usuario: ctx.from.username };
    ctx.reply("¿El avistamiento ocurrió en este momento o quieres poner fecha y hora específica? (responde: ahora / fecha)");
});

bot.on('text', ctx => {
    const id = ctx.from.id;
    if (!sesiones[id]) return;

    const sesion = sesiones[id];
    const texto = ctx.message.text.toLowerCase();

    if (sesion.estado === 'inicio') {
        if (texto.includes('ahora')) {
            sesion.fecha = new Date();
            sesion.estado = 'ubicacion';
            ctx.reply("Perfecto. Por favor indica ciudad y barrio lo más preciso posible, y referencias cercanas.");
        } else if (texto.includes('fecha')) {
            sesion.estado = 'fecha';
            ctx.reply("Indica la fecha y hora del avistamiento (YYYY-MM-DD HH:MM).");
        }
    } else if (sesion.estado === 'fecha') {
        sesion.fecha = texto;
        sesion.estado = 'ubicacion';
        ctx.reply("Ahora indica ciudad y barrio lo más preciso posible, y referencias cercanas.");
    } else if (sesion.estado === 'ubicacion') {
        sesion.ubicacion = texto;
        sesion.estado = 'descripcion';
        ctx.reply("Describe brevemente lo que viste.");
    } else if (sesion.estado === 'descripcion') {
        sesion.descripcion = texto;
        sesion.estado = 'categoria';
        ctx.reply("Selecciona categoría: OVNI / Luz extraña / Otro");
    } else if (sesion.estado === 'categoria') {
        sesion.categoria = texto;
        sesion.estado = 'multimedia';
        ctx.reply("Opcional: puedes enviar fotos o videos del avistamiento. Si no tienes, escribe 'skip'.");
    } else if (sesion.estado === 'multimedia') {
        if (texto !== 'skip') {
            sesion.multimedia = texto;
        }
        const reporte = {
            usuario: ctx.from.username,
            fecha: sesion.fecha,
            mensaje: sesion.descripcion,
            categoria: sesion.categoria,
            ubicacion: sesion.ubicacion,
            multimedia: sesion.multimedia ? [sesion.multimedia] : [],
            vip: false,
            count: 1
        };
        const filePath = path.join(__dirname, 'data', 'reportes.json');
        let reportes = [];
        if (fs.existsSync(filePath)) reportes = JSON.parse(fs.readFileSync(filePath));
        reportes.push(reporte);
        fs.writeFileSync(filePath, JSON.stringify(reportes, null, 2));

        ctx.reply("Reporte recibido y guardado correctamente.");
        delete sesiones[id];
    }
});

bot.launch();
