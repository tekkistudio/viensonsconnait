// src/lib/services/StockManager.ts
import { supabase } from '@/lib/supabase';

interface StockOperation {
  productId: string;
  quantity: number;
  operation: 'decrement' | 'increment';
  reason: 'sale' | 'return' | 'adjustment' | 'restock';
  orderId?: string;
  userId?: string;
}

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock';
}

interface StockSummary {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock';
}

export class StockManager {
  private static instance: StockManager | null = null;
  private readonly LOW_STOCK_THRESHOLD = 5;

  private constructor() {
    // Démarrer le nettoyage automatique des réservations expirées
    this.startAutomaticCleanup();
  }

  public static getInstance(): StockManager {
    if (!this.instance) {
      this.instance = new StockManager();
    }
    return this.instance;
  }

  // ==========================================
  // GESTION AUTOMATIQUE DES STOCKS
  // ==========================================

  async processStockOperation(operation: StockOperation): Promise<boolean> {
    try {
      // Utiliser la fonction PostgreSQL pour la mise à jour atomique
      const { data, error } = await supabase.rpc('update_product_stock', {
        p_product_id: operation.productId,
        p_quantity_change: operation.operation === 'decrement' ? -operation.quantity : operation.quantity,
        p_reason: operation.reason,
        p_order_id: operation.orderId ? parseInt(operation.orderId) : null
      });

      if (error) {
        console.error('Stock operation failed:', error);
        return false;
      }

      // Les données retournées contiennent {new_stock, success}
      const result = data?.[0];
      if (!result?.success) {
        console.error('Stock operation unsuccessful');
        return false;
      }

      console.log(`Stock updated for product ${operation.productId}: new stock = ${result.new_stock}`);

      // Vérifier les alertes de stock après l'opération
      await this.checkStockAlerts(operation.productId);

      return true;
    } catch (error) {
      console.error('Error in processStockOperation:', error);
      return false;
    }
  }

  async decrementStock(productId: string, quantity: number, orderId: string): Promise<boolean> {
    console.log(`Decrementing stock: product=${productId}, quantity=${quantity}, order=${orderId}`);
    
    return this.processStockOperation({
      productId,
      quantity,
      operation: 'decrement',
      reason: 'sale',
      orderId
    });
  }

  async incrementStock(productId: string, quantity: number, reason: 'return' | 'restock' = 'restock'): Promise<boolean> {
    console.log(`Incrementing stock: product=${productId}, quantity=${quantity}, reason=${reason}`);
    
    return this.processStockOperation({
      productId,
      quantity,
      operation: 'increment',
      reason
    });
  }

  async getCurrentStock(productId: string): Promise<number> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (error || !product) {
        console.error('Error fetching stock:', error);
        return 0;
      }

      return product.stock_quantity || 0;
    } catch (error) {
      console.error('Error in getCurrentStock:', error);
      return 0;
    }
  }

  async getAvailableStock(productId: string): Promise<number> {
    try {
      // Utiliser la vue stock_summary pour obtenir le stock disponible
      const { data, error } = await supabase
        .from('stock_summary')
        .select('available_quantity')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Error fetching available stock:', error);
        return 0;
      }

      return data.available_quantity || 0;
    } catch (error) {
      console.error('Error in getAvailableStock:', error);
      return 0;
    }
  }

  async isStockAvailable(productId: string, requestedQuantity: number): Promise<boolean> {
    try {
      // Utiliser la fonction PostgreSQL pour vérifier la disponibilité
      const { data, error } = await supabase.rpc('check_stock_availability', {
        p_product_id: productId,
        p_requested_quantity: requestedQuantity
      });

      if (error) {
        console.error('Error checking stock availability:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in isStockAvailable:', error);
      return false;
    }
  }

  async checkStockAlerts(productId: string): Promise<StockAlert[]> {
    try {
      const { data: summary, error } = await supabase
        .from('stock_summary')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !summary) {
        console.error('Error fetching stock summary:', error);
        return [];
      }

      const alerts: StockAlert[] = [];
      const currentStock = summary.available_quantity || 0;

      if (currentStock === 0) {
        alerts.push({
          productId: summary.id,
          productName: summary.name,
          currentStock,
          threshold: 0,
          alertType: 'out_of_stock'
        });
      } else if (currentStock <= this.LOW_STOCK_THRESHOLD) {
        alerts.push({
          productId: summary.id,
          productName: summary.name,
          currentStock,
          threshold: this.LOW_STOCK_THRESHOLD,
          alertType: 'low_stock'
        });
      }

      // Envoyer les alertes si nécessaire
      if (alerts.length > 0) {
        await this.sendStockAlerts(alerts);
      }

      return alerts;
    } catch (error) {
      console.error('Error checking stock alerts:', error);
      return [];
    }
  }

  private async sendStockAlerts(alerts: StockAlert[]): Promise<void> {
    try {
      for (const alert of alerts) {
        // Log l'alerte pour le moment
        console.warn(`📢 Stock Alert: ${alert.productName} - ${alert.currentStock} unités disponibles`);
        
        // TODO: Implémenter l'envoi d'emails/SMS aux gestionnaires
        // await this.notifyStockAlert(alert);
      }
    } catch (error) {
      console.error('Error sending stock alerts:', error);
    }
  }

  // ==========================================
  // RÉSERVATION DE STOCK OPTIMISÉE
  // ==========================================

  async reserveStock(
    productId: string, 
    quantity: number, 
    sessionId: string,
    minutesToExpire: number = 15
  ): Promise<boolean> {
    try {
      console.log(`Attempting to reserve stock: product=${productId}, quantity=${quantity}, session=${sessionId}`);
      
      // Utiliser la fonction PostgreSQL pour réserver le stock
      const { data, error } = await supabase.rpc('reserve_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_session_id: sessionId,
        p_minutes_to_expire: minutesToExpire
      });

      if (error) {
        console.error('Error creating stock reservation:', error);
        return false;
      }

      const success = data === true;
      console.log(`Stock reservation ${success ? 'successful' : 'failed'} for session ${sessionId}`);
      
      return success;
    } catch (error) {
      console.error('Error in reserveStock:', error);
      return false;
    }
  }

  async releaseReservation(sessionId: string): Promise<void> {
    try {
      console.log(`Releasing reservation for session: ${sessionId}`);
      
      const { error } = await supabase
        .from('stock_reservations')
        .update({ 
          status: 'released',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('status', 'active');

      if (error) {
        console.error('Error releasing reservation:', error);
      } else {
        console.log(`Reservation released for session: ${sessionId}`);
      }
    } catch (error) {
      console.error('Error releasing reservation:', error);
    }
  }

  async confirmReservation(sessionId: string, orderId: string): Promise<void> {
    try {
      console.log(`Confirming reservation for session: ${sessionId}, order: ${orderId}`);
      
      // Récupérer les réservations actives
      const { data: reservations, error: fetchError } = await supabase
        .from('stock_reservations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'active');

      if (fetchError || !reservations || reservations.length === 0) {
        console.warn('No active reservations found for session:', sessionId);
        return;
      }

      console.log(`Found ${reservations.length} reservations to confirm`);

      // Confirmer chaque réservation
      for (const reservation of reservations) {
        // Marquer la réservation comme confirmée
        const { error: updateError } = await supabase
          .from('stock_reservations')
          .update({
            status: 'confirmed',
            order_id: parseInt(orderId),
            updated_at: new Date().toISOString()
          })
          .eq('id', reservation.id);

        if (updateError) {
          console.error('Error confirming reservation:', updateError);
        } else {
          console.log(`Reservation confirmed: ${reservation.id} for product ${reservation.product_id}`);
        }
      }
    } catch (error) {
      console.error('Error confirming reservation:', error);
    }
  }

  // ==========================================
  // NETTOYAGE AUTOMATIQUE
  // ==========================================

  private startAutomaticCleanup(): void {
    // Nettoyer les réservations expirées toutes les 5 minutes
    setInterval(async () => {
      await this.cleanupExpiredReservations();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('✅ Automatic reservation cleanup started');
  }

  async cleanupExpiredReservations(): Promise<number> {
    try {
      // Utiliser la fonction PostgreSQL pour le nettoyage
      const { data, error } = await supabase.rpc('cleanup_expired_reservations');

      if (error) {
        console.error('Error cleaning up expired reservations:', error);
        return 0;
      }

      const cleanedCount = data || 0;
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired reservations`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error in cleanupExpiredReservations:', error);
      return 0;
    }
  }

  // ==========================================
  // RAPPORTS ET STATISTIQUES
  // ==========================================

  async getStockSummary(): Promise<StockSummary[]> {
    try {
      const { data, error } = await supabase
        .from('stock_summary')
        .select('*')
        .order('stock_quantity', { ascending: true });

      if (error) {
        console.error('Error fetching stock summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStockSummary:', error);
      return [];
    }
  }

  async getStockReport(): Promise<{
    totalProducts: number;
    outOfStock: number;
    lowStock: number;
    inStock: number;
    products: StockSummary[];
  }> {
    try {
      const products = await this.getStockSummary();

      const report = {
        totalProducts: products.length,
        outOfStock: products.filter(p => p.stock_status === 'out_of_stock').length,
        lowStock: products.filter(p => p.stock_status === 'low_stock').length,
        inStock: products.filter(p => p.stock_status === 'in_stock').length,
        products
      };

      return report;
    } catch (error) {
      console.error('Error generating stock report:', error);
      return {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        inStock: 0,
        products: []
      };
    }
  }

  async getStockMovements(productId?: string, limit: number = 50): Promise<any[]> {
    try {
      let query = supabase
        .from('stock_movements_detailed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock movements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return [];
    }
  }

  async getReservations(sessionId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('stock_reservations')
        .select(`
          *,
          products(name, price)
        `)
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  async adjustStock(
    productId: string, 
    newQuantity: number, 
    reason: string = 'manual_adjustment'
  ): Promise<boolean> {
    try {
      const currentStock = await this.getCurrentStock(productId);
      const difference = newQuantity - currentStock;

      if (difference === 0) {
        return true; // Aucun changement nécessaire
      }

      return this.processStockOperation({
        productId,
        quantity: Math.abs(difference),
        operation: difference > 0 ? 'increment' : 'decrement',
        reason: 'adjustment'
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return false;
    }
  }

  async bulkStockUpdate(updates: Array<{
    productId: string;
    quantity: number;
    reason?: string;
  }>): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const result = await this.adjustStock(
          update.productId, 
          update.quantity, 
          update.reason || 'bulk_update'
        );
        
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error updating stock for product ${update.productId}:`, error);
        failed++;
      }
    }

    console.log(`Bulk stock update completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  async getProductStockHistory(productId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('stock_movements_detailed')
        .select('*')
        .eq('product_id', productId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching stock history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching stock history:', error);
      return [];
    }
  }

  // ==========================================
  // MÉTHODES DE MONITORING
  // ==========================================

  async getStockMetrics(): Promise<{
    totalValue: number;
    averageStockLevel: number;
    turnoverRate: number;
    alertsCount: number;
  }> {
    try {
      const summary = await this.getStockSummary();
      
      const totalValue = summary.reduce((sum, product) => 
        sum + (product.available_quantity * product.price), 0
      );
      
      const averageStockLevel = summary.length > 0 
        ? summary.reduce((sum, product) => sum + product.available_quantity, 0) / summary.length
        : 0;
      
      const alertsCount = summary.filter(product => 
        product.stock_status === 'low_stock' || product.stock_status === 'out_of_stock'
      ).length;

      // Pour le turnover rate, on aurait besoin de données sur les ventes
      // Ceci est une estimation simplifiée
      const turnoverRate = 0; // À implémenter avec des données de ventes

      return {
        totalValue,
        averageStockLevel,
        turnoverRate,
        alertsCount
      };
    } catch (error) {
      console.error('Error calculating stock metrics:', error);
      return {
        totalValue: 0,
        averageStockLevel: 0,
        turnoverRate: 0,
        alertsCount: 0
      };
    }
  }

  async getLowStockProducts(): Promise<StockSummary[]> {
    try {
      const { data, error } = await supabase
        .from('stock_summary')
        .select('*')
        .in('stock_status', ['low_stock', 'out_of_stock'])
        .order('available_quantity', { ascending: true });

      if (error) {
        console.error('Error fetching low stock products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }

  async getTopSellingProducts(days: number = 30): Promise<Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('stock_movements_detailed')
        .select('*')
        .eq('reason', 'sale')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching sales data:', error);
        return [];
      }

      // Grouper par produit et calculer les totaux
      const salesMap = new Map();
      
      data?.forEach(movement => {
        const productId = movement.product_id;
        if (!salesMap.has(productId)) {
          salesMap.set(productId, {
            productId,
            productName: movement.product_name,
            quantitySold: 0,
            revenue: 0
          });
        }
        
        const product = salesMap.get(productId);
        product.quantitySold += Math.abs(movement.quantity_change);
        // La revenue serait calculée avec le prix de vente au moment de la transaction
        // Ici c'est une estimation
      });

      return Array.from(salesMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10); // Top 10
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      return [];
    }
  }

  // ==========================================
  // MÉTHODES DE DIAGNOSTIC
  // ==========================================

  async performStockAudit(): Promise<{
    totalProducts: number;
    inconsistencies: number;
    recommendations: string[];
  }> {
    try {
      const summary = await this.getStockSummary();
      const inconsistencies = summary.filter(product => 
        product.stock_quantity < 0 || product.available_quantity < 0
      ).length;

      const recommendations: string[] = [];
      
      const outOfStockCount = summary.filter(p => p.stock_status === 'out_of_stock').length;
      const lowStockCount = summary.filter(p => p.stock_status === 'low_stock').length;
      
      if (outOfStockCount > 0) {
        recommendations.push(`${outOfStockCount} produit(s) en rupture de stock nécessitent un réapprovisionnement`);
      }
      
      if (lowStockCount > 0) {
        recommendations.push(`${lowStockCount} produit(s) avec un stock faible à surveiller`);
      }
      
      if (inconsistencies > 0) {
        recommendations.push(`${inconsistencies} incohérence(s) détectée(s) dans les stocks`);
      }

      return {
        totalProducts: summary.length,
        inconsistencies,
        recommendations
      };
    } catch (error) {
      console.error('Error performing stock audit:', error);
      return {
        totalProducts: 0,
        inconsistencies: 0,
        recommendations: ['Erreur lors de l\'audit des stocks']
      };
    }
  }

  // ==========================================
  // EXPORT/IMPORT DE DONNÉES
  // ==========================================

  async exportStockData(): Promise<{
    products: StockSummary[];
    movements: any[];
    reservations: any[];
    exportDate: string;
  }> {
    try {
      const products = await this.getStockSummary();
      const movements = await this.getStockMovements(undefined, 1000);
      const reservations = await this.getReservations();

      return {
        products,
        movements,
        reservations,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting stock data:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES DE NOTIFICATION
  // ==========================================

  private async notifyStockAlert(alert: StockAlert): Promise<void> {
    // TODO: Implémenter l'envoi de notifications
    // - Email aux gestionnaires
    // - SMS d'urgence
    // - Notifications push dans l'admin
    
    console.log(`🚨 ALERT: ${alert.alertType} for ${alert.productName}`);
    console.log(`Current stock: ${alert.currentStock}, Threshold: ${alert.threshold}`);
  }
}