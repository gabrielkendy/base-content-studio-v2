// Meta Ads API Integration
// Simplificado: só métricas essenciais

const META_API_URL = 'https://graph.facebook.com/v21.0'
const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN!

export interface Campaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  daily_budget?: number
  lifetime_budget?: number
}

export interface CampaignInsights {
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  spend: number
  results: number
  cost_per_result: number
  roas: number
  daily_budget?: number
  lifetime_budget?: number
}

export interface AdAccount {
  id: string
  name: string
  account_id: string
  currency: string
  account_status: number
}

// Buscar contas de anúncios disponíveis
export async function getAdAccounts(): Promise<AdAccount[]> {
  try {
    const res = await fetch(
      `${META_API_URL}/me/adaccounts?fields=id,name,account_id,currency,account_status&access_token=${ACCESS_TOKEN}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) {
      console.error('Meta API error:', await res.text())
      return []
    }
    
    const data = await res.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch ad accounts:', error)
    return []
  }
}

// Buscar campanhas de uma conta
export async function getCampaigns(adAccountId: string): Promise<Campaign[]> {
  try {
    // Garantir formato correto (act_XXXXX)
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    
    const res = await fetch(
      `${META_API_URL}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&access_token=${ACCESS_TOKEN}`,
      { next: { revalidate: 0 } }
    )
    
    if (!res.ok) {
      console.error('Meta API error:', await res.text())
      return []
    }
    
    const data = await res.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return []
  }
}

// Buscar insights de campanhas (métricas)
export async function getCampaignInsights(
  adAccountId: string,
  datePreset: string = 'last_7d'
): Promise<CampaignInsights[]> {
  try {
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    
    // Primeiro busca campanhas
    const campaigns = await getCampaigns(adAccountId)
    if (campaigns.length === 0) return []
    
    // Buscar insights da conta com breakdown por campanha
    const res = await fetch(
      `${META_API_URL}/${accountId}/insights?` +
      `fields=campaign_id,campaign_name,spend,actions,action_values,cost_per_action_type` +
      `&level=campaign` +
      `&date_preset=${datePreset}` +
      `&access_token=${ACCESS_TOKEN}`,
      { next: { revalidate: 0 } }
    )
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Meta API insights error:', errorText)
      return []
    }
    
    const insightsData = await res.json()
    const insights = insightsData.data || []
    
    // Mapear campanhas com insights
    const campaignMap = new Map(campaigns.map(c => [c.id, c]))
    
    const results: CampaignInsights[] = []
    
    for (const insight of insights) {
      const campaign = campaignMap.get(insight.campaign_id)
      if (!campaign) continue
      
      // Extrair resultados (leads, conversões, etc)
      const actions = insight.actions || []
      const leadAction = actions.find((a: any) => a.action_type === 'lead')
      const purchaseAction = actions.find((a: any) => a.action_type === 'purchase')
      const onsiteConversion = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')
      
      // Pegar o resultado principal baseado no objetivo
      let resultCount = 0
      if (leadAction) resultCount = parseInt(leadAction.value) || 0
      else if (purchaseAction) resultCount = parseInt(purchaseAction.value) || 0
      else if (onsiteConversion) resultCount = parseInt(onsiteConversion.value) || 0
      
      // Extrair valores de conversão para ROAS
      const actionValues = insight.action_values || []
      const purchaseValue = actionValues.find((a: any) => a.action_type === 'purchase')
      const totalValue = purchaseValue ? parseFloat(purchaseValue.value) || 0 : 0
      
      const spend = parseFloat(insight.spend) || 0
      const costPerResult = resultCount > 0 ? spend / resultCount : 0
      const roas = spend > 0 ? totalValue / spend : 0
      
      results.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name || campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend,
        results: resultCount,
        cost_per_result: costPerResult,
        roas,
        daily_budget: campaign.daily_budget ? campaign.daily_budget / 100 : undefined,
        lifetime_budget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : undefined,
      })
    }
    
    // Adicionar campanhas sem insights (gastos zerados)
    for (const campaign of campaigns) {
      if (!results.find(r => r.campaign_id === campaign.id)) {
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          spend: 0,
          results: 0,
          cost_per_result: 0,
          roas: 0,
          daily_budget: campaign.daily_budget ? campaign.daily_budget / 100 : undefined,
          lifetime_budget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : undefined,
        })
      }
    }
    
    return results
  } catch (error) {
    console.error('Failed to fetch campaign insights:', error)
    return []
  }
}

// Buscar insights com datas customizadas
export async function getCampaignInsightsCustom(
  adAccountId: string,
  dateStart: string,
  dateEnd: string
): Promise<CampaignInsights[]> {
  try {
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    
    const campaigns = await getCampaigns(adAccountId)
    if (campaigns.length === 0) return []
    
    const res = await fetch(
      `${META_API_URL}/${accountId}/insights?` +
      `fields=campaign_id,campaign_name,spend,actions,action_values,cost_per_action_type` +
      `&level=campaign` +
      `&time_range={"since":"${dateStart}","until":"${dateEnd}"}` +
      `&access_token=${ACCESS_TOKEN}`,
      { next: { revalidate: 0 } }
    )
    
    if (!res.ok) {
      console.error('Meta API insights error:', await res.text())
      return []
    }
    
    const insightsData = await res.json()
    const insights = insightsData.data || []
    
    const campaignMap = new Map(campaigns.map(c => [c.id, c]))
    
    const results: CampaignInsights[] = []
    
    for (const insight of insights) {
      const campaign = campaignMap.get(insight.campaign_id)
      if (!campaign) continue
      
      const actions = insight.actions || []
      const leadAction = actions.find((a: any) => a.action_type === 'lead')
      const purchaseAction = actions.find((a: any) => a.action_type === 'purchase')
      const onsiteConversion = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')
      
      let resultCount = 0
      if (leadAction) resultCount = parseInt(leadAction.value) || 0
      else if (purchaseAction) resultCount = parseInt(purchaseAction.value) || 0
      else if (onsiteConversion) resultCount = parseInt(onsiteConversion.value) || 0
      
      const actionValues = insight.action_values || []
      const purchaseValue = actionValues.find((a: any) => a.action_type === 'purchase')
      const totalValue = purchaseValue ? parseFloat(purchaseValue.value) || 0 : 0
      
      const spend = parseFloat(insight.spend) || 0
      const costPerResult = resultCount > 0 ? spend / resultCount : 0
      const roas = spend > 0 ? totalValue / spend : 0
      
      results.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name || campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend,
        results: resultCount,
        cost_per_result: costPerResult,
        roas,
        daily_budget: campaign.daily_budget ? campaign.daily_budget / 100 : undefined,
        lifetime_budget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : undefined,
      })
    }
    
    for (const campaign of campaigns) {
      if (!results.find(r => r.campaign_id === campaign.id)) {
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          spend: 0,
          results: 0,
          cost_per_result: 0,
          roas: 0,
          daily_budget: campaign.daily_budget ? campaign.daily_budget / 100 : undefined,
          lifetime_budget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : undefined,
        })
      }
    }
    
    return results
  } catch (error) {
    console.error('Failed to fetch campaign insights:', error)
    return []
  }
}

// Mapear date preset para label
export const DATE_PRESETS = {
  'today': 'Hoje',
  'yesterday': 'Ontem',
  'last_7d': 'Últimos 7 dias',
  'last_14d': 'Últimos 14 dias',
  'last_30d': 'Últimos 30 dias',
  'this_month': 'Este mês',
  'last_month': 'Mês passado',
} as const

export type DatePreset = keyof typeof DATE_PRESETS
