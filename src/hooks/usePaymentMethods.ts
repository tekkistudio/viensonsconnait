// src/hooks/usePaymentMethods.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types/payment-config'

interface UsePaymentMethodsOptions {
  countryCode?: string;
  amount?: number;
}

export function usePaymentMethods({ countryCode = 'SN', amount = 0 }: UsePaymentMethodsOptions = {}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentMethods()
  }, [countryCode, amount])

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .contains('country_availability', [countryCode])
        .lte('minimum_amount', amount)
        .order('name')

      if (error) throw error

      // Filtrer les méthodes basées sur le montant maximum si défini
      const filteredMethods = (data || []).filter(method => 
        !method.maximum_amount || method.maximum_amount >= amount
      )

      setMethods(filteredMethods)
    } catch (err) {
      setError('Erreur lors du chargement des méthodes de paiement')
      console.error('Payment methods fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateFees = (method: PaymentMethod) => {
    if (method.fees.type === 'fixed') {
      return method.fees.value
    } else {
      return Math.round((amount * method.fees.value) / 100)
    }
  }

  const getPaymentMethodDetails = (methodId: string) => {
    const method = methods.find(m => m.id === methodId)
    if (!method) return null

    return {
      ...method,
      calculatedFees: calculateFees(method),
      totalAmount: amount + calculateFees(method)
    }
  }

  const getAvailableMethods = () => {
    return methods.map(method => ({
      id: method.id,
      name: method.metadata.displayName || method.name,
      description: method.metadata.description,
      icon: method.metadata.icon,
      fees: calculateFees(method),
      totalAmount: amount + calculateFees(method),
      requiredFields: method.metadata.requiredFields || []
    }))
  }

  return {
    methods: getAvailableMethods(),
    isLoading,
    error,
    getPaymentMethodDetails,
    refresh: fetchPaymentMethods
  }
}