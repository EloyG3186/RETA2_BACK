-- VERIFICACIÓN MANUAL DE DATOS PARA EVENTOS PRÓXIMOS
-- Usuario EloyG (ID: 2)

-- 1. Verificar participaciones del usuario
SELECT 
    p."userId", 
    p."challengeId", 
    p.status as participant_status, 
    c.title, 
    c.status as challenge_status,
    c."createdAt",
    c."updatedAt"
FROM "Participants" p
INNER JOIN "Challenges" c ON p."challengeId" = c.id
WHERE p."userId" = 2
ORDER BY c."createdAt" DESC;

-- 2. Desafíos pendientes (debería generar eventos)
SELECT 
    c.id, 
    c.title, 
    c.status, 
    c."createdAt",
    'PENDING EVENT' as event_type
FROM "Challenges" c
INNER JOIN "Participants" p ON c.id = p."challengeId"
WHERE p."userId" = 2 
  AND c.status = 'pending'
ORDER BY c."createdAt" DESC
LIMIT 3;

-- 3. Desafíos en evaluación (debería generar eventos)
SELECT 
    c.id, 
    c.title, 
    c.status, 
    c."updatedAt",
    'JUDGING EVENT' as event_type
FROM "Challenges" c
INNER JOIN "Participants" p ON c.id = p."challengeId"
WHERE p."userId" = 2 
  AND c.status = 'judging'
ORDER BY c."updatedAt" DESC
LIMIT 2;

-- 4. Contar desafíos por status para el usuario
SELECT 
    c.status,
    COUNT(*) as count
FROM "Challenges" c
INNER JOIN "Participants" p ON c.id = p."challengeId"
WHERE p."userId" = 2
GROUP BY c.status
ORDER BY count DESC;

-- 5. Verificar si el usuario existe
SELECT id, username, email FROM "Users" WHERE id = 2;

-- RESULTADO ESPERADO:
-- - Si hay desafíos con status 'pending' o 'judging' → Deberían generar eventos específicos
-- - Si NO hay desafíos específicos → Deberían generarse 5 eventos generales automáticamente
-- - Si el array está vacío → HAY UN ERROR en el código del backend
