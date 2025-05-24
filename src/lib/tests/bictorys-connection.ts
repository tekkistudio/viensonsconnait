// src/lib/tests/bictorys-connection.ts
import axios, { AxiosError } from 'axios';

async function testBictorysConnection() {
  const apiUrl = process.env.NEXT_PUBLIC_BICTORYS_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_BICTORYS_API_KEY;

  console.log('\nConfiguration de test:');
  console.log('API URL:', apiUrl);
  console.log('API Key (premiers caractères):', apiKey?.substring(0, 15));

  try {
    console.log('\nTest de création d\'une charge...');
    
    const testData = {
      amount: 100,
      currency: "XOF",
      country: "SN",
      paymentReference: `test_${Date.now()}`,
      successRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/success`,
      errorRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/error`,
      callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/bictorys`,
      customer: {
        name: "Test User",
        phone: "+221776794638",
        email: "test@example.com",
        city: "Dakar",
        country: "SN"
      }
    };

    console.log('\nDonnées de test:', testData);

    const chargeResponse = await axios.post(
      `${apiUrl}/pay/v1/charges`,
      testData,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\nRéponse de création de charge:', {
      status: chargeResponse.status,
      statusText: chargeResponse.statusText,
      data: chargeResponse.data
    });

    // Vérification de la réponse
    if (chargeResponse.data.link && chargeResponse.data.chargeId) {
      return {
        success: true,
        data: {
          charge: chargeResponse.data,
          checkoutUrl: chargeResponse.data.link,
          chargeId: chargeResponse.data.chargeId,
          message: 'Charge créée avec succès. L\'URL de paiement et l\'ID de charge sont disponibles.'
        }
      };
    } else {
      console.warn('\nAvertissement: La réponse ne contient pas tous les champs attendus');
      return {
        success: true,
        data: chargeResponse.data,
        warning: 'La réponse ne contient pas tous les champs attendus'
      };
    }

  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('\nErreur lors du test:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Messages d'erreur spécifiques
      if (error.response?.status === 401) {
        console.error('Erreur d\'authentification: Vérifiez votre clé API');
      } else if (error.response?.status === 404) {
        console.error('Endpoint non trouvé: Vérifiez l\'URL de l\'API');
      }

      return {
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }

    return {
      success: false,
      error: {
        message: 'Une erreur inattendue est survenue',
        details: String(error)
      }
    };
  }
}

export { testBictorysConnection };