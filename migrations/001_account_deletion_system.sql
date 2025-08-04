-- =====================================================
-- MIGRACIÓN: SISTEMA DE ELIMINACIÓN DE CUENTA
-- Versión: 001
-- Fecha: 29/01/2025
-- Descripción: Agrega campos y tablas para eliminación lógica de usuarios
-- =====================================================

-- 1. MODIFICAR TABLA USERS - AGREGAR CAMPOS DE ELIMINACIÓN
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(30) DEFAULT 'public';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS audit_retention BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_hold_until DATE NULL;

-- Comentarios para documentación
COMMENT ON COLUMN users.account_status IS 'Estado de la cuenta: active, deactivated, privacy_deleted, audit_retained, legal_hold, suspended';
COMMENT ON COLUMN users.privacy_level IS 'Nivel de privacidad: public, restricted, audit_only';
COMMENT ON COLUMN users.deactivated_at IS 'Fecha de desactivación de la cuenta';
COMMENT ON COLUMN users.privacy_deleted_at IS 'Fecha de eliminación de datos personales';
COMMENT ON COLUMN users.audit_retention IS 'Si se deben conservar datos para auditoría';
COMMENT ON COLUMN users.legal_hold_until IS 'Fecha hasta la cual se debe retener por motivos legales';

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_privacy_level ON users(privacy_level);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_users_audit_retention ON users(audit_retention);

-- =====================================================
-- 2. TABLA: USER_AUDIT_TRAIL
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

-- Comentarios
COMMENT ON TABLE user_audit_trail IS 'Registro de auditoría para usuarios eliminados';
COMMENT ON COLUMN user_audit_trail.original_user_id IS 'ID original del usuario antes de eliminación';
COMMENT ON COLUMN user_audit_trail.username IS 'Nombre de usuario conservado para transparencia';
COMMENT ON COLUMN user_audit_trail.email_hash IS 'Hash del email para identificación sin exponer datos';
COMMENT ON COLUMN user_audit_trail.deletion_type IS 'Tipo: voluntary, administrative, legal, violation';
COMMENT ON COLUMN user_audit_trail.audit_data IS 'Datos adicionales en formato JSON';

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_trail_original_user_id ON user_audit_trail(original_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_username ON user_audit_trail(username);
CREATE INDEX IF NOT EXISTS idx_audit_trail_deletion_type ON user_audit_trail(deletion_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON user_audit_trail(created_at);

-- =====================================================
-- 3. TABLA: USER_LEGAL_HOLDS
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

-- Comentarios
COMMENT ON TABLE user_legal_holds IS 'Retenciones legales que bloquean eliminación de usuarios';
COMMENT ON COLUMN user_legal_holds.case_reference IS 'Referencia del caso legal';
COMMENT ON COLUMN user_legal_holds.requested_by IS 'Autoridad que solicita la retención';
COMMENT ON COLUMN user_legal_holds.status IS 'Estado: active, expired, released';

-- Índices
CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON user_legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON user_legal_holds(status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_hold_until ON user_legal_holds(hold_until);

-- =====================================================
-- 4. TABLA: USER_EXIT_SURVEYS
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

-- Comentarios
COMMENT ON TABLE user_exit_surveys IS 'Encuestas de salida para analizar motivos de eliminación';
COMMENT ON COLUMN user_exit_surveys.primary_reason IS 'Razón principal de eliminación';
COMMENT ON COLUMN user_exit_surveys.features_used IS 'Array JSON de funcionalidades utilizadas';
COMMENT ON COLUMN user_exit_surveys.return_likelihood IS 'Probabilidad de regresar (1-10)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_exit_surveys_user_id ON user_exit_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_primary_reason ON user_exit_surveys(primary_reason);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_satisfaction_rating ON user_exit_surveys(satisfaction_rating);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_created_at ON user_exit_surveys(created_at);

-- =====================================================
-- 5. TABLA: ACCOUNT_RECOVERY_REQUESTS
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
-- 6. TABLA: DELETION_ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS deletion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_deletions INTEGER DEFAULT 0,
  reactivations INTEGER DEFAULT 0,
  primary_reasons JSONB,
  satisfaction_average DECIMAL(3,2),
  return_likelihood_average DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE deletion_analytics IS 'Analytics agregados de eliminaciones por período';
COMMENT ON COLUMN deletion_analytics.primary_reasons IS 'Conteo de razones principales en JSON';

-- Índices
CREATE INDEX IF NOT EXISTS idx_deletion_analytics_period ON deletion_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_deletion_analytics_created_at ON deletion_analytics(created_at);

-- =====================================================
-- 7. FUNCIONES Y TRIGGERS
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

-- =====================================================
-- 8. DATOS INICIALES
-- =====================================================

-- Insertar configuraciones del sistema para eliminación
INSERT INTO system_config (key, value, description) VALUES 
('deletion_grace_period_days', '30', 'Días de gracia antes de eliminación de privacidad')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES 
('audit_retention_years', '7', 'Años de retención de datos de auditoría')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES 
('deletion_notification_days', '[7, 20, 27]', 'Días para enviar recordatorios de eliminación')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 9. VERIFICACIÓN DE MIGRACIÓN
-- =====================================================

-- Verificar que todas las tablas fueron creadas
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests', 'deletion_analytics')
    AND table_schema = 'public';
    
    IF table_count = 5 THEN
        RAISE NOTICE 'MIGRACIÓN EXITOSA: Todas las tablas fueron creadas correctamente';
    ELSE
        RAISE EXCEPTION 'ERROR EN MIGRACIÓN: Solo % de 5 tablas fueron creadas', table_count;
    END IF;
END $$;

-- Verificar que los campos fueron agregados a users
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until');
    
    IF column_count = 6 THEN
        RAISE NOTICE 'MIGRACIÓN EXITOSA: Todos los campos fueron agregados a la tabla users';
    ELSE
        RAISE EXCEPTION 'ERROR EN MIGRACIÓN: Solo % de 6 campos fueron agregados a users', column_count;
    END IF;
END $$;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

COMMIT;
