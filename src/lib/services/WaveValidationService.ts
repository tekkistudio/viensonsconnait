// src/lib/services/WaveValidationService.ts - VALIDATION RENFORCÉE WAVE
import { supabase } from '@/lib/supabase';

interface WaveValidationResult {
  isValid: boolean;
  confidence: 'low' | 'medium' | 'high';
  warnings: string[];
  shouldManualReview: boolean;
  validationDetails: {
    formatValid: boolean;
    lengthValid: boolean;
    patternValid: boolean;
    notRecentlyUsed: boolean;
    amountReasonable: boolean;
  };
}

interface PendingWaveTransaction {
  id: string;
  transaction_id: string;
  order_id: string;
  amount: number;
  customer_phone: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  created_at: string;
  verified_at?: string;
  verification_method: 'automatic' | 'manual_admin' | 'customer_proof';
}

export class WaveValidationService {
  private static instance: WaveValidationService;

  public static getInstance(): WaveValidationService {
    if (!this.instance) {
      this.instance = new WaveValidationService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE : Validation renforcée
  public async validateWaveTransaction(
    transactionId: string,
    expectedAmount: number,
    customerPhone: string,
    orderId: string
  ): Promise<WaveValidationResult> {
    
    const warnings: string[] = [];
    const validationDetails = {
      formatValid: false,
      lengthValid: false,
      patternValid: false,
      notRecentlyUsed: false,
      amountReasonable: false
    };

    try {
      console.log('🔍 Enhanced Wave validation:', { transactionId, expectedAmount, orderId });

      // ✅ 1. Validation du format avancée
      validationDetails.formatValid = this.validateTransactionFormat(transactionId);
      if (!validationDetails.formatValid) {
        warnings.push('Format d\'ID de transaction invalide');
      }

      // ✅ 2. Validation de la longueur
      validationDetails.lengthValid = transactionId.length >= 12 && transactionId.length <= 25;
      if (!validationDetails.lengthValid) {
        warnings.push('Longueur d\'ID suspecte');
      }

      // ✅ 3. Validation du pattern Wave
      validationDetails.patternValid = this.validateWavePattern(transactionId);
      if (!validationDetails.patternValid) {
        warnings.push('Pattern ne correspond pas aux standards Wave');
      }

      // ✅ 4. Vérifier que l'ID n'a pas été utilisé récemment
      validationDetails.notRecentlyUsed = await this.checkNotRecentlyUsed(transactionId);
      if (!validationDetails.notRecentlyUsed) {
        warnings.push('ID de transaction déjà utilisé récemment');
      }

      // ✅ 5. Vérifier que le montant est raisonnable
      validationDetails.amountReasonable = this.validateAmountReasonable(expectedAmount);
      if (!validationDetails.amountReasonable) {
        warnings.push('Montant de transaction suspect');
      }

      // ✅ 6. Calculer le niveau de confiance
      const validCount = Object.values(validationDetails).filter(Boolean).length;
      const confidence = this.calculateConfidence(validCount, warnings.length);

      // ✅ 7. Déterminer si révision manuelle nécessaire
      const shouldManualReview = confidence === 'low' || warnings.length >= 3;

      // ✅ 8. Enregistrer pour suivi administratif
      if (validationDetails.formatValid) {
        await this.recordPendingTransaction({
          transaction_id: transactionId,
          order_id: orderId,
          amount: expectedAmount,
          customer_phone: customerPhone,
          confidence,
          warnings
        });
      }

      return {
        isValid: validationDetails.formatValid && confidence !== 'low',
        confidence,
        warnings,
        shouldManualReview,
        validationDetails
      };

    } catch (error) {
      console.error('❌ Wave validation error:', error);
      return {
        isValid: false,
        confidence: 'low',
        warnings: ['Erreur de validation technique'],
        shouldManualReview: true,
        validationDetails
      };
    }
  }

  // ✅ MÉTHODE : Validation format renforcée
  private validateTransactionFormat(transactionId: string): boolean {
    const cleanId = transactionId.trim().toUpperCase();
    
    // Patterns Wave connus
    const wavePatterns = [
      /^T[A-Z0-9]{10,20}$/,           // Format classique avec T
      /^TXN[A-Z0-9]{8,15}$/,          // Format avec TXN
      /^PAY[A-Z0-9]{8,15}$/,          // Format avec PAY
      /^WV[A-Z0-9]{10,18}$/,          // Format Wave spécifique
      /^[A-Z0-9]{12,20}$/             // Format alphanumérique général
    ];
    
    return wavePatterns.some(pattern => pattern.test(cleanId));
  }

  // ✅ MÉTHODE : Validation pattern Wave
  private validateWavePattern(transactionId: string): boolean {
    const cleanId = transactionId.trim().toUpperCase();
    
    // Caractéristiques typiques des IDs Wave
    const hasValidStart = /^(T|TXN|PAY|WV)/.test(cleanId);
    const hasValidChars = /^[A-Z0-9]+$/.test(cleanId);
    const hasValidMix = /[0-9]/.test(cleanId) && /[A-Z]/.test(cleanId);
    
    return hasValidChars && (hasValidStart || hasValidMix);
  }

  // ✅ MÉTHODE : Vérifier usage récent
  private async checkNotRecentlyUsed(transactionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at')
        .or(`metadata->>'waveTransactionId.eq.${transactionId},metadata->>'transaction_id.eq.${transactionId}`)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 jours
        .limit(1);

      if (error) {
        console.warn('⚠️ Could not check recent usage:', error);
        return true; // En cas d'erreur, on considère comme OK
      }

      return !data || data.length === 0;
    } catch (error) {
      console.warn('⚠️ Error checking recent usage:', error);
      return true;
    }
  }

  // ✅ MÉTHODE : Valider montant raisonnable
  private validateAmountReasonable(amount: number): boolean {
    // Montants raisonnables pour VIENS ON S'CONNAÎT
    const MIN_AMOUNT = 5000;   // 5,000 FCFA minimum
    const MAX_AMOUNT = 500000; // 500,000 FCFA maximum
    
    return amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
  }

  // ✅ MÉTHODE : Calculer confiance
  private calculateConfidence(validCount: number, warningCount: number): 'low' | 'medium' | 'high' {
    if (validCount >= 4 && warningCount === 0) return 'high';
    if (validCount >= 3 && warningCount <= 1) return 'medium';
    return 'low';
  }

  // ✅ MÉTHODE : Enregistrer transaction en attente
  private async recordPendingTransaction(data: {
    transaction_id: string;
    order_id: string;
    amount: number;
    customer_phone: string;
    confidence: string;
    warnings: string[];
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('wave_pending_transactions')
        .insert({
          transaction_id: data.transaction_id,
          order_id: data.order_id,
          amount: data.amount,
          customer_phone: data.customer_phone,
          status: 'pending_verification',
          verification_method: 'automatic',
          metadata: {
            confidence: data.confidence,
            warnings: data.warnings,
            validation_timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('⚠️ Could not record pending transaction:', error);
      }
    } catch (error) {
      console.warn('⚠️ Error recording pending transaction:', error);
    }
  }

  // ✅ MÉTHODE : Obtenir transactions en attente (pour admin)
  public async getPendingTransactions(): Promise<PendingWaveTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wave_pending_transactions')
        .select('*')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching pending transactions:', error);
      return [];
    }
  }

  // ✅ MÉTHODE : Marquer comme vérifié manuellement
  public async markAsVerified(transactionId: string, adminNote?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wave_pending_transactions')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verification_method: 'manual_admin',
          admin_note: adminNote
        })
        .eq('transaction_id', transactionId);

      return !error;
    } catch (error) {
      console.error('❌ Error marking as verified:', error);
      return false;
    }
  }
}