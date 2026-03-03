const fs = require('fs');
const PATH = './data.json';

function cargarData(){
    if(!fs.existsSync(PATH)) fs.writeFileSync(PATH, '[]', 'utf8');
    return JSON.parse(fs.readFileSync(PATH, 'utf8'));
}

function guardarReporte(reporte){
    const data = cargarData();
    data.push(reporte);
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { cargarData, guardarReporte };