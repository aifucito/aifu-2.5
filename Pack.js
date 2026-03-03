const fs = require('fs-extra');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data.json');
const UPLOADS_PATH = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, JSON.stringify({ reportes: [], usuarios: [] }, null, 2));
if (!fs.existsSync(UPLOADS_PATH)) fs.mkdirSync(UPLOADS_PATH);

function leerData() {
    return JSON.parse(fs.readFileSync(DATA_PATH));
}

function guardarData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    guardarReporte: (reporte) => {
        const data = leerData();
        data.reportes.push(reporte);

        // Agregar usuario si no existe
        if (!data.usuarios.some(u => u.id === reporte.usuario)) {
            data.usuarios.push({ id: reporte.usuario, nombre: reporte.nombre, vip: reporte.vip });
        }

        guardarData(data);
    },

    guardarArchivo: async (file) => {
        const filePath = path.join(UPLOADS_PATH, file.file_name);
        await fs.writeFile(filePath, file.data);
        return filePath;
    },

    leerUsuarios: () => {
        const data = leerData();
        return data.usuarios;
    },

    leerReportes: () => {
        const data = leerData();
        return data.reportes;
    }
};