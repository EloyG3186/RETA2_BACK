const { Badge } = require('../models');

async function updateBadgesToSvg() {
  try {
    console.log('🔄 Actualizando URLs de insignias a formato SVG...');

    // Obtener todas las insignias
    const badges = await Badge.findAll();

    for (const badge of badges) {
      if (badge.imageUrl && badge.imageUrl.endsWith('.png')) {
        // Cambiar .png por .svg
        const newImageUrl = badge.imageUrl.replace('.png', '.svg');
        
        await Badge.update(
          { imageUrl: newImageUrl },
          { where: { id: badge.id } }
        );
        
        console.log(`✅ Actualizada: ${badge.name} -> ${newImageUrl}`);
      } else if (!badge.imageUrl) {
        // Si no tiene imageUrl, asignar la por defecto según categoría
        const defaultImageUrl = `/badges/${badge.category}-default.svg`;
        
        await Badge.update(
          { imageUrl: defaultImageUrl },
          { where: { id: badge.id } }
        );
        
        console.log(`✅ Asignada imagen por defecto: ${badge.name} -> ${defaultImageUrl}`);
      }
    }

    console.log('🎉 ¡Todas las insignias actualizadas a SVG!');
  } catch (error) {
    console.error('❌ Error al actualizar insignias:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  updateBadgesToSvg().then(() => process.exit(0));
}

module.exports = updateBadgesToSvg;
