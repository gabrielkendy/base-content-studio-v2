'use client'

import { createContext, useContext } from 'react'

export interface PortalClienteData {
  clienteId: string | null
  clienteSlug: string | null
  clienteNome: string | null
}

export const PortalClienteContext = createContext<PortalClienteData>({
  clienteId: null,
  clienteSlug: null,
  clienteNome: null,
})

export function usePortalCliente() {
  return useContext(PortalClienteContext)
}
