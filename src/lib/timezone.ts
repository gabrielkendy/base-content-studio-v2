/**
 * Utilitários de timezone para o BASE Content Studio
 *
 * Problema: new Date(`${date}T${time}:00`) em servidores UTC cria timestamps
 * errados para usuários no Brasil (UTC-3). 15:00 SP vira 15:00 UTC = 18:00 SP.
 *
 * Solução: converter explicitamente horário local + timezone → UTC.
 */

/**
 * Converte data + hora em um timezone específico para um objeto Date UTC.
 *
 * Exemplo:
 *   parseScheduledAt("2026-03-25", "15:00", "America/Sao_Paulo")
 *   → new Date("2026-03-25T18:00:00.000Z")  (SP = UTC-3, logo 15h SP = 18h UTC)
 */
export function parseScheduledAt(
  dateStr: string,  // YYYY-MM-DD
  timeStr: string,  // HH:mm
  timezone: string  // IANA timezone, ex: "America/Sao_Paulo"
): Date {
  // 1. Tratar a string como UTC temporariamente
  const asUTC = new Date(`${dateStr}T${timeStr}:00Z`)

  // 2. Converter esse instante UTC para o horário que aparece no timezone alvo
  const inTZ = new Date(asUTC.toLocaleString('en-US', { timeZone: timezone }))

  // 3. A diferença representa o offset do timezone
  //    offset > 0 = timezone está atrás do UTC (ex: SP = UTC-3 → diff = +3h em ms)
  const offset = asUTC.getTime() - inTZ.getTime()

  // 4. Somar o offset para obter o UTC correto para o horário local desejado
  return new Date(asUTC.getTime() + offset)
}

/**
 * Verifica se uma data+hora está no passado, usando o timezone correto.
 */
export function isInPast(
  dateStr: string,
  timeStr: string,
  timezone: string
): boolean {
  return parseScheduledAt(dateStr, timeStr, timezone) <= new Date()
}

/**
 * Formata uma data UTC para exibição no fuso horário do Brasil.
 */
export function formatBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
