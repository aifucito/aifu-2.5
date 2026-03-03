
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/reportes', (req, res) => {
    let reportes = [];
    const filePath = path.join(__dirname, 'data', 'reportes.json');
    if (fs.existsSync(filePath)) {
        reportes = JSON.parse(fs.readFileSync(filePath));
    }

    const { tipo, usuario, vip } = req.query;
    let filtrados = reportes;

    if (tipo === 'ultimo_año') {
        const hoy = new Date();
        const unAñoAtras = new Date();
        unAñoAtras.setFullYear(hoy.getFullYear() - 1);
        filtrados = filtrados.filter(r => new Date(r.fecha) >= unAñoAtras);
    }

    if (vip !== 'true') {
        filtrados = filtrados.map(r => {
            if (r.usuario !== usuario) {
                return {
                    mensaje: r.mensaje,
                    fecha: r.fecha,
                    categoria: r.categoria,
                    ciudad: r.ciudad,
                    barrio: r.barrio,
                    pais: r.pais
                }
            }
            return r;
        });
    }

    res.json(filtrados);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
