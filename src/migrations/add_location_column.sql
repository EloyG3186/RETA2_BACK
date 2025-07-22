-- Script para añadir la columna 'location' a la tabla 'users'
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Comentario: Este script añade una columna de tipo VARCHAR para almacenar la ubicación del usuario
-- La sintaxis 'IF NOT EXISTS' asegura que no se producirá un error si la columna ya existe
