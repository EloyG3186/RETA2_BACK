/**
 * Script para verificar y corregir la codificación de archivos a UTF-8
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

// Directorios a excluir
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

// Extensiones de archivos a procesar
const fileExtensions = ['.js', '.json', '.md', '.sql', '.env', '.example', '.txt'];

// Función para verificar si un archivo debe ser procesado
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return fileExtensions.includes(ext);
}

// Función para verificar y corregir la codificación de un archivo
async function fixFileEncoding(filePath) {
  try {
    // Leer el archivo como buffer
    const buffer = fs.readFileSync(filePath);
    
    // Detectar la codificación
    const detected = jschardet.detect(buffer);
    const encoding = detected.encoding || 'utf8';
    
    // Si no es UTF-8, convertir
    if (encoding.toLowerCase() !== 'utf-8' && encoding.toLowerCase() !== 'ascii') {
      console.log(`Convirtiendo ${filePath} de ${encoding} a UTF-8`);
      
      // Decodificar el contenido con la codificación detectada
      const content = iconv.decode(buffer, encoding);
      
      // Codificar a UTF-8
      const utf8Content = iconv.encode(content, 'utf-8');
      
      // Escribir el archivo con codificación UTF-8
      fs.writeFileSync(filePath, utf8Content);
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Error al procesar ${filePath}:`, error.message);
    return false;
  }
}

// Función para recorrer directorios recursivamente
async function processDirectory(dirPath) {
  let filesProcessed = 0;
  let filesConverted = 0;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Saltar directorios excluidos
        if (excludeDirs.includes(entry.name)) {
          continue;
        }
        
        // Procesar subdirectorio
        const subDirStats = await processDirectory(fullPath);
        filesProcessed += subDirStats.filesProcessed;
        filesConverted += subDirStats.filesConverted;
      } else if (entry.isFile() && shouldProcessFile(fullPath)) {
        // Procesar archivo
        filesProcessed++;
        const converted = await fixFileEncoding(fullPath);
        if (converted) {
          filesConverted++;
        }
      }
    }
  } catch (error) {
    console.error(`Error al procesar directorio ${dirPath}:`, error.message);
  }
  
  return { filesProcessed, filesConverted };
}

// Función principal
async function main() {
  const rootDir = path.resolve(__dirname, '..');
  console.log(`Verificando codificación de archivos en ${rootDir}...`);
  
  const stats = await processDirectory(rootDir);
  
  console.log('\nResumen:');
  console.log(`Archivos procesados: ${stats.filesProcessed}`);
  console.log(`Archivos convertidos a UTF-8: ${stats.filesConverted}`);
  console.log('Proceso completado.');
}

// Ejecutar la función principal
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
