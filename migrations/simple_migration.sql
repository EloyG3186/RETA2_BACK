-- =====================================================
-- MIGRACIÓN SIMPLE: SISTEMA DE ELIMINACIÓN DE CUENTA
-- =====================================================

-- 1. Alteraciones a tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20) DEFAULT 'public';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS audit_retention BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_hold_until TIMESTAMP NULL;

-- 2. Crear tabla user_audit_trail
CREATE TABLE IF NOT EXISTS user_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  original_username VARCHAR(50) NOT NULL,
  email_hash VARCHAR(64) NOT NULL,
  account_created_at TIMESTAMP NOT NULL,
  account_deleted_at TIMESTAMP NOT NULL,
  deletion_type VARCHAR(20) NOT NULL,
  total_challenges_created INTEGER DEFAULT 0,
  total_challenges_participated INTEGER DEFAULT 0,
  total_friends INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  audit_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear tabla user_legal_holds
CREATE TABLE IF NOT EXISTS user_legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_reference VARCHAR(100),
  hold_reason TEXT NOT NULL,
  requested_by VARCHAR(100) NOT NULL,
  contact_info TEXT,
  hold_start_date TIMESTAMP DEFAULT NOW(),
  hold_until_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  released_by VARCHAR(100),
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Crear tabla user_exit_surveys
CREATE TABLE IF NOT EXISTS user_exit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  primary_reason VARCHAR(50) NOT NULL,
  detailed_reason TEXT,
  overall_satisfaction INTEGER,
  recommendation_likelihood INTEGER,
  features_used JSONB,
  suggestions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Crear tabla account_recovery_requests
CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  recovery_type VARCHAR(20) NOT NULL,
  verification_token VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  documents_provided JSONB,
  reviewer_id UUID,
  review_notes TEXT,
  resolved_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_original_user_id ON user_audit_trail(original_user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON user_legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_user_id ON user_exit_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_user_id ON account_recovery_requests(user_id);

-- Verificación final
SELECT 'MIGRACIÓN COMPLETADA' as status;
