-- =====================================================
-- MIGRACIÓN: SISTEMA DE ELIMINACIÓN DE CUENTA
-- Versión: 1.0 (Corregida)
-- Fecha: 29/01/2025
-- =====================================================

-- Verificar que estamos en la base de datos correcta
SELECT current_database();

-- =====================================================
-- 1. ALTERACIONES A TABLA USERS
-- =====================================================

-- Agregar nuevas columnas a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'deactivated', 'privacy_deleted'));

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'audit_only'));

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privacy_deleted_at TIMESTAMP NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS audit_retention BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS legal_hold_until TIMESTAMP NULL;

-- Comentarios para las nuevas columnas
COMMENT ON COLUMN users.account_status IS 'Estado de la cuenta: active, deactivated, privacy_deleted';
COMMENT ON COLUMN users.privacy_level IS 'Nivel de privacidad: public, private, audit_only';
COMMENT ON COLUMN users.deactivated_at IS 'Fecha de desactivación de la cuenta';
COMMENT ON COLUMN users.privacy_deleted_at IS 'Fecha de eliminación de datos personales';
COMMENT ON COLUMN users.audit_retention IS 'Si los datos deben retenerse para auditoría';
COMMENT ON COLUMN users.legal_hold_until IS 'Fecha hasta la cual hay retención legal';

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_users_privacy_deleted_at ON users(privacy_deleted_at);

-- =====================================================
-- 2. TABLA: USER_AUDIT_TRAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS user_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  original_username VARCHAR(50) NOT NULL,
  email_hash VARCHAR(64) NOT NULL,
  account_created_at TIMESTAMP NOT NULL,
  account_deleted_at TIMESTAMP NOT NULL,
  deletion_type VARCHAR(20) NOT NULL CHECK (deletion_type IN ('user_requested', 'privacy_deletion', 'admin_action', 'legal_requirement')),
  total_challenges_created INTEGER DEFAULT 0,
  total_challenges_participated INTEGER DEFAULT 0,
  total_friends INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  audit_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE user_audit_trail IS 'Registro de auditoría para usuarios eliminados';
COMMENT ON COLUMN user_audit_trail.email_hash IS 'Hash SHA-256 del email original para verificación';
COMMENT ON COLUMN user_audit_trail.deletion_type IS 'Tipo de eliminación realizada';
COMMENT ON COLUMN user_audit_trail.audit_data IS 'Datos adicionales de auditoría en JSON';

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_trail_original_user_id ON user_audit_trail(original_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_email_hash ON user_audit_trail(email_hash);
CREATE INDEX IF NOT EXISTS idx_audit_trail_deletion_type ON user_audit_trail(deletion_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON user_audit_trail(created_at);

-- =====================================================
-- 3. TABLA: USER_LEGAL_HOLDS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_reference VARCHAR(100),
  hold_reason TEXT NOT NULL,
  requested_by VARCHAR(100) NOT NULL,
  contact_info TEXT,
  hold_start_date TIMESTAMP DEFAULT NOW(),
  hold_until_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired')),
  released_by VARCHAR(100),
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE user_legal_holds IS 'Retenciones legales que impiden eliminación de datos';
COMMENT ON COLUMN user_legal_holds.case_reference IS 'Referencia del caso legal o investigación';
COMMENT ON COLUMN user_legal_holds.hold_reason IS 'Razón de la retención legal';
COMMENT ON COLUMN user_legal_holds.status IS 'Estado: active, released, expired';

-- Índices
CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON user_legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON user_legal_holds(status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_case_reference ON user_legal_holds(case_reference);
CREATE INDEX IF NOT EXISTS idx_legal_holds_created_at ON user_legal_holds(created_at);

-- =====================================================
-- 4. TABLA: USER_EXIT_SURVEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_exit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  primary_reason VARCHAR(50) NOT NULL,
  detailed_reason TEXT,
  overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 10),
  recommendation_likelihood INTEGER CHECK (recommendation_likelihood >= 1 AND recommendation_likelihood <= 10),
  features_used JSONB,
  suggestions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE user_exit_surveys IS 'Encuestas de salida para usuarios que eliminan su cuenta';
COMMENT ON COLUMN user_exit_surveys.primary_reason IS 'Razón principal de eliminación';
COMMENT ON COLUMN user_exit_surveys.overall_satisfaction IS 'Satisfacción general (1-10)';
COMMENT ON COLUMN user_exit_surveys.recommendation_likelihood IS 'Probabilidad de recomendar (1-10)';
COMMENT ON COLUMN user_exit_surveys.features_used IS 'Lista de características utilizadas';

-- Índices
CREATE INDEX IF NOT EXISTS idx_exit_surveys_user_id ON user_exit_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_primary_reason ON user_exit_surveys(primary_reason);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_created_at ON user_exit_surveys(created_at);

-- =====================================================
-- 5. TABLA: ACCOUNT_RECOVERY_REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  recovery_type VARCHAR(20) NOT NULL CHECK (recovery_type IN ('simple', 'verified', 'administrative')),
  verification_token VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  documents_provided JSONB,
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  resolved_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE account_recovery_requests IS 'Solicitudes de recuperación de cuentas eliminadas';
COMMENT ON COLUMN account_recovery_requests.recovery_type IS 'Tipo: simple, verified, administrative';
COMMENT ON COLUMN account_recovery_requests.status IS 'Estado: pending, approved, rejected, expired';
COMMENT ON COLUMN account_recovery_requests.documents_provided IS 'Documentos de verificación en JSON';

-- Índices
CREATE INDEX IF NOT EXISTS idx_recovery_requests_user_id ON account_recovery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_email ON account_recovery_requests(email);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_status ON account_recovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_created_at ON account_recovery_requests(created_at);

-- =====================================================
-- 6. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_audit_trail_updated_at ON user_audit_trail;
CREATE TRIGGER update_user_audit_trail_updated_at 
    BEFORE UPDATE ON user_audit_trail 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_legal_holds_updated_at ON user_legal_holds;
CREATE TRIGGER update_user_legal_holds_updated_at 
    BEFORE UPDATE ON user_legal_holds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_recovery_requests_updated_at ON account_recovery_requests;
CREATE TRIGGER update_account_recovery_requests_updated_at 
    BEFORE UPDATE ON account_recovery_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. DATOS INICIALES
-- =====================================================

-- Verificar si existe la tabla system_config
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_config') THEN
        -- Insertar configuraciones del sistema para eliminación
        INSERT INTO system_config (key, value, description) VALUES 
        ('deletion_grace_period_days', '30', 'Días de gracia antes de eliminación de privacidad')
        ON CONFLICT (key) DO NOTHING;

        INSERT INTO system_config (key, value, description) VALUES 
        ('audit_retention_years', '7', 'Años de retención de datos de auditoría')
        ON CONFLICT (key) DO NOTHING;

        INSERT INTO system_config (key, value, description) VALUES 
        ('recovery_token_expiry_hours', '72', 'Horas de validez del token de recuperación')
        ON CONFLICT (key) DO NOTHING;
    ELSE
        RAISE NOTICE 'Tabla system_config no existe. Saltando inserción de configuraciones.';
    END IF;
END
$$;

-- =====================================================
-- 8. VERIFICACIONES FINALES
-- =====================================================

-- Verificar que todas las tablas fueron creadas
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests') 
        THEN '✅ Creada'
        ELSE '❌ No encontrada'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests')
AND table_schema = 'public'
ORDER BY table_name;

-- Verificar columnas agregadas a users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until')
ORDER BY column_name;

-- Mostrar resumen
SELECT 
    'MIGRACIÓN COMPLETADA EXITOSAMENTE' as resultado,
    NOW() as fecha_completada;
