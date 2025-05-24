// src/lib/services/DashboardManager.ts
import OpenAI from "openai";
import { PromptManager } from "./PromptManager";
import { supabase } from "@/lib/supabase";

interface AdvancedMetrics {
  cac: number;               // Coût d'acquisition client
  ltv: number;               // Valeur vie client
  retentionRate: number;     // Taux de fidélisation
  cartAbandonRate: number;   // Taux d'abandon panier
  avgTimeToConversion: number; // Temps moyen avant achat
  engagementScore: number;   // Score d'engagement client
}

interface ReportData {
  metrics: AdvancedMetrics;
  insights: string[];
  recommendations: string[];
  trends: {
    sales: string;
    conversion: string;
    engagement: string;
  };
}

export class DashboardManager {
    private static instance: DashboardManager | null = null;
    private promptManager: PromptManager;
    private openai: OpenAI;
  
    private constructor() {
      this.promptManager = PromptManager.getInstance();
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || '' 
      });
    }

  public static getInstance(): DashboardManager {
    if (!DashboardManager.instance) {
      DashboardManager.instance = new DashboardManager();
    }
    return DashboardManager.instance;
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI configuration missing');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async calculateAdvancedMetrics(storeId: string, startDate: Date, endDate: Date): Promise<AdvancedMetrics> {
    try {
      // Récupérer les données nécessaires
      const [orders, conversions, pageViews] = await Promise.all([
        this.getOrders(storeId, startDate, endDate),
        this.getConversions(storeId, startDate, endDate),
        this.getPageViews(storeId, startDate, endDate)
      ]);

      // Calculer les métriques
      const totalCustomers = new Set(orders.map(o => o.customer_id)).size;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const totalMarketingCost = await this.getMarketingCost(storeId, startDate, endDate);

      return {
        cac: totalMarketingCost / totalCustomers,
        ltv: totalRevenue / totalCustomers,
        retentionRate: this.calculateRetentionRate(orders),
        cartAbandonRate: this.calculateCartAbandonRate(conversions),
        avgTimeToConversion: this.calculateAvgTimeToConversion(conversions),
        engagementScore: this.calculateEngagementScore(pageViews)
      };
    } catch (error) {
      console.error('Error calculating advanced metrics:', error);
      throw error;
    }
  }

  async generatePerformanceReport(storeId: string): Promise<ReportData> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metrics = await this.calculateAdvancedMetrics(storeId, startDate, endDate);
      const context = await this.getStoreContext(storeId);
      
      // Générer les insights avec l'IA
      const insights = await this.generateAIInsights(metrics, context);

      return {
        metrics,
        insights: insights.recommendations,
        recommendations: insights.actions,
        trends: {
          sales: insights.salesTrend,
          conversion: insights.conversionTrend,
          engagement: insights.engagementTrend
        }
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  private async getOrders(storeId: string, startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  private async getConversions(storeId: string, startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  private async getPageViews(storeId: string, startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('page_views')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  private async getMarketingCost(storeId: string, startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await supabase
      .from('marketing_expenses')
      .select('amount')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;
    return (data || []).reduce((sum, expense) => sum + expense.amount, 0);
  }

  private calculateRetentionRate(orders: any[]): number {
    const customers = orders.reduce((acc, order) => {
      if (!acc[order.customer_id]) {
        acc[order.customer_id] = [];
      }
      acc[order.customer_id].push(order.created_at);
      return acc;
    }, {});

    const repeatCustomers = Object.values(customers).filter((dates: any) => dates.length > 1).length;
    const totalCustomers = Object.keys(customers).length;

    return totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  }

  private calculateCartAbandonRate(conversions: any[]): number {
    const abandonedCarts = conversions.filter(c => c.type === 'cart_abandon').length;
    const totalCarts = conversions.length;
    return totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0;
  }

  private calculateAvgTimeToConversion(conversions: any[]): number {
    const conversionTimes = conversions
      .filter(c => c.type === 'purchase' && c.first_visit_at)
      .map(c => new Date(c.created_at).getTime() - new Date(c.first_visit_at).getTime());

    return conversionTimes.length > 0 
      ? conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length / (1000 * 60 * 60) // en heures
      : 0;
  }

  private calculateEngagementScore(pageViews: any[]): number {
    const totalVisits = pageViews.length;
    if (totalVisits === 0) return 0;

    const avgTimeOnSite = pageViews.reduce((sum, view) => 
      sum + (view.duration || 0), 0) / totalVisits;
    
    const pagesPerVisit = pageViews.reduce((sum, view) => 
      sum + (view.pages_viewed || 1), 0) / totalVisits;

    // Score sur 100
    return Math.min(
      ((avgTimeOnSite / 300) * 50) + // 5 minutes = score parfait pour le temps
      ((pagesPerVisit / 5) * 50),    // 5 pages = score parfait pour la navigation
      100
    );
  }

  private async getStoreContext(storeId: string) {
    const { data, error } = await supabase
      .from('stores')
      .select(`
        *,
        products (count),
        orders (count)
      `)
      .eq('id', storeId)
      .single();

    if (error) throw error;
    return data;
  }

  private async generateAIInsights(metrics: AdvancedMetrics, context: any) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: this.promptManager.generateDashboardPrompt({ 
            page: "Performance Analysis",
            data: { metrics, context }
          }, [])
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  }

  async saveReport(storeId: string, report: ReportData) {
    const { error } = await supabase
      .from('advanced_metrics')
      .insert({
        store_id: storeId,
        date_period: new Date().toISOString(),
        metrics: report.metrics,
        insights: report.insights,
        recommendations: report.recommendations
      });

    if (error) throw error;
  }
}

export const dashboardManager = DashboardManager.getInstance();