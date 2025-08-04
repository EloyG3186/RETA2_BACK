// Script para agregar campos de control del juez a la tabla challenges
const { sequelize } = require('../config/database');

async function addJudgeControlFields() {
  try {
    console.log('🚀 Iniciando migración de campos de control del juez...');
    
    // Verificar y agregar winnerId
    const [winnerIdResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'winnerId';
    `);
    
    if (winnerIdResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN "winnerId" UUID REFERENCES users(id);
      `);
      console.log('✅ Campo "winnerId" agregado');
    } else {
      console.log('✅ Campo "winnerId" ya existe');
    }

    // Verificar y agregar winnerReason
    const [winnerReasonResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'winnerReason';
    `);
    
    if (winnerReasonResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN "winnerReason" TEXT;
      `);
      console.log('✅ Campo "winnerReason" agregado');
    } else {
      console.log('✅ Campo "winnerReason" ya existe');
    }

    // Verificar y agregar closedAt
    const [closedAtResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'closedAt';
    `);
    
    if (closedAtResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN "closedAt" TIMESTAMP;
      `);
      console.log('✅ Campo "closedAt" agregado');
    } else {
      console.log('✅ Campo "closedAt" ya existe');
    }

    // Verificar y agregar judgingStartedAt
    const [judgingStartedAtResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'judgingStartedAt';
    `);
    
    if (judgingStartedAtResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN "judgingStartedAt" TIMESTAMP;
      `);
      console.log('✅ Campo "judgingStartedAt" agregado');
    } else {
      console.log('✅ Campo "judgingStartedAt" ya existe');
    }

    // Verificar y agregar completedAt
    const [completedAtResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'completedAt';
    `);
    
    if (completedAtResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN "completedAt" TIMESTAMP;
      `);
      console.log('✅ Campo "completedAt" agregado');
    } else {
      console.log('✅ Campo "completedAt" ya existe');
    }

    // Actualizar ENUM de status para incluir 'closed'
    try {
      await sequelize.query(`
        ALTER TYPE "enum_challenges_status" ADD VALUE IF NOT EXISTS 'closed';
      `);
      console.log('✅ Valor "closed" agregado al ENUM de status');
    } catch (enumError) {
      console.log('ℹ️ Valor "closed" ya existe en el ENUM o error esperado:', enumError.message);
    }
    
    console.log('✅ Migración de campos de control del juez completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración de campos de control del juez:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
addJudgeControlFields();
