const fs = require('fs');
const path = require('path');

// Asegurar que el directorio exista
const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Crear un avatar por defecto como archivo SVG
const defaultAvatarSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#E5E7EB"/>
  <path d="M100 110 C120 110 140 90 140 70 C140 50 120 30 100 30 C80 30 60 50 60 70 C60 90 80 110 100 110 Z M50 170 C50 140 70 110 100 110 C130 110 150 140 150 170 L50 170 Z" fill="#9CA3AF"/>
</svg>`;

// Convertir SVG a buffer
const svgBuffer = Buffer.from(defaultAvatarSVG);

// Guardar el archivo
const filePath = path.join(uploadDir, 'default-profile.svg');
fs.writeFileSync(filePath, svgBuffer);

console.log(`Avatar por defecto creado en: ${filePath}`);

// También crear un enlace simbólico o copia para .png
const pngPath = path.join(uploadDir, 'default-profile.png');
fs.copyFileSync(filePath, pngPath);
console.log(`Copia de avatar creada en: ${pngPath}`);
