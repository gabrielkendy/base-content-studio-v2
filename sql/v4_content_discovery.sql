-- =====================================================
-- BASE CONTENT STUDIO V4 - CONTENT DISCOVERY MODULE
-- Tabelas para busca viral e criação de conteúdo
-- =====================================================

-- 1. FONTES DE CONTEÚDO (perfis/sites monitorados)
CREATE TABLE IF NOT EXISTS content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificação
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'website')),
    handle TEXT NOT NULL,                    -- @username ou URL
    name TEXT,                               -- Nome de exibição
    avatar_url TEXT,
    
    -- Categorização
    niche TEXT[] DEFAULT '{}',               -- ['fitness', 'saude', 'longevidade']
    language TEXT DEFAULT 'en',              -- Idioma principal
    
    -- Métricas
    followers_count INTEGER DEFAULT 0,
    avg_engagement DECIMAL(5,2) DEFAULT 0,   -- Taxa média de engajamento
    
    -- Controle
    is_active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMPTZ,
    scrape_frequency TEXT DEFAULT 'daily',   -- daily, weekly, manual
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, handle)
);

-- 2. CONTEÚDOS DESCOBERTOS (posts virais encontrados)
CREATE TABLE IF NOT EXISTS discovered_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
    
    -- Identificação do post original
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,               -- ID do post na plataforma
    external_url TEXT,                       -- Link direto
    
    -- Tipo de conteúdo
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'carrossel', 'reels', 'video', 'story', 'thread')),
    
    -- Conteúdo
    caption TEXT,
    thumbnail_url TEXT,
    media_urls TEXT[] DEFAULT '{}',          -- URLs das mídias
    slide_count INTEGER DEFAULT 1,           -- Qtd slides se carrossel
    duration_seconds INTEGER,                -- Duração se vídeo
    
    -- Métricas originais
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    
    -- Score IA
    virality_score INTEGER DEFAULT 0 CHECK (virality_score >= 0 AND virality_score <= 100),
    relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    adaptability_score INTEGER DEFAULT 0 CHECK (adaptability_score >= 0 AND adaptability_score <= 100),
    overall_score INTEGER GENERATED ALWAYS AS ((virality_score + relevance_score + adaptability_score) / 3) STORED,
    
    -- IA Analysis
    ai_summary TEXT,                         -- Resumo do conteúdo pela IA
    ai_topics TEXT[] DEFAULT '{}',           -- Tópicos identificados
    ai_suggested_framework TEXT,             -- Framework BrandsDecoded sugerido
    
    -- Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'queued', 'created', 'discarded')),
    
    -- Metadados
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ,                   -- Data original do post
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_id)
);

-- 3. FILA DE CRIAÇÃO (conteúdos selecionados para criar)
CREATE TABLE IF NOT EXISTS creation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    discovered_content_id UUID REFERENCES discovered_content(id) ON DELETE SET NULL,
    
    -- Info do conteúdo a criar
    title TEXT NOT NULL,
    source_url TEXT,
    source_handle TEXT,
    source_platform TEXT,
    
    -- Configuração de criação
    target_format TEXT DEFAULT 'carrossel' CHECK (target_format IN ('carrossel', 'reels', 'post', 'thread')),
    target_slides INTEGER DEFAULT 10,
    framework TEXT,                          -- Framework BrandsDecoded escolhido
    custom_instructions TEXT,                -- Instruções adicionais
    
    -- Cliente destino (opcional)
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Aguardando início
        'generating',   -- IA gerando
        'review',       -- Pronto para revisão
        'approved',     -- Aprovado
        'published',    -- Publicado
        'discarded'     -- Descartado
    )),
    
    -- Resultado
    generated_content JSONB,                 -- { slides: [...], cta: "...", hashtags: [...] }
    generated_images TEXT[] DEFAULT '{}',    -- URLs das imagens geradas
    
    -- Prioridade e ordem
    priority INTEGER DEFAULT 0,              -- Maior = mais prioritário
    position INTEGER DEFAULT 0,              -- Ordem na fila
    
    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);

-- 4. MENSAGENS DO CHAT (conversa com IA por criação)
CREATE TABLE IF NOT EXISTS creation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID REFERENCES creation_queue(id) ON DELETE CASCADE,
    
    -- Mensagem
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',             -- { model: "claude-3", tokens: 1234 }
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BASE DE CONHECIMENTO (PDFs e instruções)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Tipo
    type TEXT NOT NULL CHECK (type IN ('pdf', 'text', 'url')),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Conteúdo
    file_url TEXT,                           -- URL do arquivo (se PDF)
    content TEXT,                            -- Texto extraído ou instrução
    
    -- Categorização
    category TEXT DEFAULT 'general',         -- general, framework, voice, visual
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    processed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONFIGURAÇÕES DE CRIAÇÃO POR TENANT
CREATE TABLE IF NOT EXISTS creation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- Configurações padrão
    default_framework TEXT DEFAULT 'curiosidade',
    default_slides INTEGER DEFAULT 10,
    default_format TEXT DEFAULT 'carrossel',
    
    -- Tom de voz
    voice_instructions TEXT,
    
    -- Hashtags padrão por nicho
    default_hashtags JSONB DEFAULT '{}',     -- { "fitness": ["#fitness", "#gym"], ... }
    
    -- CTA padrão
    default_cta TEXT,
    
    -- Imagens
    image_style TEXT DEFAULT 'cinematografico',
    image_prompt_template TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_content_sources_tenant ON content_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_platform ON content_sources(platform);
CREATE INDEX IF NOT EXISTS idx_content_sources_niche ON content_sources USING GIN(niche);

CREATE INDEX IF NOT EXISTS idx_discovered_content_tenant ON discovered_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discovered_content_status ON discovered_content(status);
CREATE INDEX IF NOT EXISTS idx_discovered_content_score ON discovered_content(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_content_platform ON discovered_content(platform);
CREATE INDEX IF NOT EXISTS idx_discovered_content_discovered ON discovered_content(discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_creation_queue_tenant ON creation_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creation_queue_status ON creation_queue(status);
CREATE INDEX IF NOT EXISTS idx_creation_queue_priority ON creation_queue(priority DESC, position ASC);

CREATE INDEX IF NOT EXISTS idx_creation_messages_creation ON creation_messages(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_messages_created ON creation_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_settings ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (tenant_id match)
CREATE POLICY "content_sources_tenant_policy" ON content_sources
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "discovered_content_tenant_policy" ON discovered_content
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "creation_queue_tenant_policy" ON creation_queue
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "creation_messages_tenant_policy" ON creation_messages
    FOR ALL USING (creation_id IN (
        SELECT id FROM creation_queue WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "knowledge_base_tenant_policy" ON knowledge_base
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "creation_settings_tenant_policy" ON creation_settings
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_sources_updated_at
    BEFORE UPDATE ON content_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discovered_content_updated_at
    BEFORE UPDATE ON discovered_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creation_queue_updated_at
    BEFORE UPDATE ON creation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creation_settings_updated_at
    BEFORE UPDATE ON creation_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS - FONTES FITNESS/SAÚDE
-- =====================================================

-- Nota: Rodar após criar tenant_id válido
-- INSERT INTO content_sources (tenant_id, platform, handle, name, niche, language) VALUES
-- ('TENANT_ID', 'instagram', 'hubaboratorio', 'Dr. Andrew Huberman', ARRAY['neurociencia', 'saude', 'longevidade'], 'en'),
-- ('TENANT_ID', 'instagram', 'drpeterattia', 'Dr. Peter Attia', ARRAY['longevidade', 'medicina', 'performance'], 'en'),
-- ('TENANT_ID', 'instagram', 'foundmyfitness', 'Rhonda Patrick', ARRAY['saude', 'nutricao', 'longevidade'], 'en'),
-- ('TENANT_ID', 'instagram', 'davidasinclair', 'David Sinclair', ARRAY['longevidade', 'envelhecimento', 'ciencia'], 'en'),
-- ('TENANT_ID', 'instagram', 'stanefferding', 'Stan Efferding', ARRAY['nutricao', 'treino', 'performance'], 'en'),
-- ('TENANT_ID', 'instagram', 'laaboratorio', 'Layne Norton', ARRAY['nutricao', 'treino', 'ciencia'], 'en'),
-- ('TENANT_ID', 'instagram', 'mindpumpmedia', 'Mind Pump', ARRAY['fitness', 'treino', 'lifestyle'], 'en');
