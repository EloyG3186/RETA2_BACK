const express = require('express');
const app = express();
const PORT = 5001;

console.log('🚀 Iniciando servidor de prueba...');

app.get('/', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint funcionando' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor de prueba funcionando en puerto ${PORT}`);
});
