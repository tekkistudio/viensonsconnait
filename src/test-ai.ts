import { AIChatIntegrationService } from '@/lib/services/AIChatIntegrationService';

export async function testAI() {
  const service = AIChatIntegrationService.getInstance();
  const sessionId = `test_${Date.now()}`;
  
  try {
    const response = await service.initializeConversation(sessionId, 'test-product');
    console.log('✅ Test AI réussi:', response.content);
    return true;
  } catch (error) {
    console.error('❌ Test AI échoué:', error);
    return false;
  }
}