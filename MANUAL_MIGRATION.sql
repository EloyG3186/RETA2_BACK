-- =====================================================
-- MIGRACIÓN MANUAL: SISTEMA DE ELIMINACIÓN DE CUENTA
-- EJECUTAR MANUALMENTE EN POSTGRESQL
-- =====================================================

-- Conectar a la base de datos challenge_friends_db
-- \c challenge_friends_db;

BEGIN;

-- 1. AGREGAR CAMPOS A TABLA USERS
-- =====================================================

DO $$
BEGIN
    -- Verificar si los campos ya existen antes de agregarlos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'account_status') THEN
        ALTER TABLE users ADD COLUMN account_status VARCHAR(30) DEFAULT 'active';
        RAISE NOTICE 'Campo account_status agregado a users';
    ELSE
        RAISE NOTICE 'Campo account_status ya existe en users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'privacy_level') THEN
        ALTER TABLE users ADD COLUMN privacy_level VARCHAR(30) DEFAULT 'public';
        RAISE NOTICE 'Campo privacy_level agregado a users';
    ELSE
        RAISE NOTICE 'Campo privacy_level ya existe en users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deactivated_at') THEN
        ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP NULL;
        RAISE NOTICE 'Campo deactivated_at agregado a users';
    ELSE
        RAISE NOTICE 'Campo deactivated_at ya existe en users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'privacy_deleted_at') THEN
        ALTER TABLE users ADD COLUMN privacy_deleted_at TIMESTAMP NULL;
        RAISE NOTICE 'Campo privacy_deleted_at agregado a users';
    ELSE
        RAISE NOTICE 'Campo privacy_deleted_at ya existe en users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'audit_retention') THEN
        ALTER TABLE users ADD COLUMN audit_retention BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo audit_retention agregado a users';
    ELSE
        RAISE NOTICE 'Campo audit_retention ya existe en users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'legal_hold_until') THEN
        ALTER TABLE users ADD COLUMN legal_hold_until DATE NULL;
        RAISE NOTICE 'Campo legal_hold_until agregado a users';
    ELSE
        RAISE NOTICE 'Campo legal_hold_until ya existe en users';
    END IF;
END $$;

-- 2. CREAR TABLA USER_AUDIT_TRAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS user_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  username VARCHAR(255) NOT NULL,
  email_hash VARCHAR(255),
  account_created_at TIMESTAMP,
  account_deleted_at TIMESTAMP DEFAULT NOW(),
  deletion_type VARCHAR(50) DEFAULT 'voluntary',
  deletion_reason TEXT,
  challenges_count INTEGER DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  violations_count INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  legal_retention_until DATE,
  audit_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CREAR TABLA USER_LEGAL_HOLDS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_reference VARCHAR(255),
  hold_reason TEXT NOT NULL,
  requested_by VARCHAR(255),
  contact_info TEXT,
  hold_from DATE DEFAULT CURRENT_DATE,
  hold_until DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. CREAR TABLA USER_EXIT_SURVEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_exit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  primary_reason VARCHAR(100) NOT NULL,
  detailed_reason TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  features_used JSONB,
  suggestions TEXT,
  would_recommend BOOLEAN,
  return_likelihood INTEGER CHECK (return_likelihood >= 1 AND return_likelihood <= 10),
  platform_rating INTEGER CHECK (platform_rating >= 1 AND platform_rating <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. CREAR TABLA ACCOUNT_RECOVERY_REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  recovery_type VARCHAR(30) NOT NULL,
  verification_method VARCHAR(50),
  documents_provided JSONB,
  verification_token VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 6. CREAR ÍNDICES
-- =====================================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_privacy_level ON users(privacy_level);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);

-- Índices para user_audit_trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_original_user_id ON user_audit_trail(original_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_username ON user_audit_trail(username);
CREATE INDEX IF NOT EXISTS idx_audit_trail_deletion_type ON user_audit_trail(deletion_type);

-- Índices para user_legal_holds
CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON user_legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON user_legal_holds(status);

-- Índices para user_exit_surveys
CREATE INDEX IF NOT EXISTS idx_exit_surveys_user_id ON user_exit_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_primary_reason ON user_exit_surveys(primary_reason);

-- Índices para account_recovery_requests
CREATE INDEX IF NOT EXISTS idx_recovery_requests_user_id ON account_recovery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_email ON account_recovery_requests(email);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_status ON account_recovery_requests(status);

-- 7. VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    field_count INTEGER;
BEGIN
    -- Verificar tablas creadas
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests')
    AND table_schema = 'public';
    
    -- Verificar campos agregados
    SELECT COUNT(*) INTO field_count 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until');
    
    RAISE NOTICE '=== RESULTADO DE MIGRACIÓN ===';
    RAISE NOTICE 'Tablas creadas: % de 4', table_count;
    RAISE NOTICE 'Campos agregados a users: % de 6', field_count;
    
    IF table_count = 4 AND field_count = 6 THEN
        RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    ELSE
        RAISE NOTICE '⚠️  MIGRACIÓN INCOMPLETA - Revisar errores';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- COMANDOS PARA VERIFICAR MANUALMENTE
-- =====================================================

-- Verificar campos agregados a users:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%account%' OR column_name LIKE '%privacy%' OR column_name LIKE '%deactivated%' OR column_name LIKE '%audit%' OR column_name LIKE '%legal%';

-- Verificar tablas creadas:
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%user_%' OR table_name LIKE '%account_%' ORDER BY table_name;

-- Verificar índices:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests') ORDER BY tablename, indexname;
