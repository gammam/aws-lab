const { handler } = require( './src/index.js');

// Simula un evento Lambda
const event = {
  time: new Date().toISOString(),
  detail: {
    // Puoi aggiungere dettagli specifici per il tuo evento
  },
};

// Simula un contesto Lambda
const context = {
  awsRequestId: 'test-aws-request-id',
  functionName: 'CustomerReport',
  getRemainingTimeInMillis: () => 30000, // Simula 30 secondi rimanenti
};

// Esegui la funzione handler
(async () => {
  try {
    console.log('Esecuzione della funzione Lambda...');
    const result = await handler(event, context);
    console.log('Risultato:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Errore durante l\'esecuzione della funzione Lambda:', error);
  }
})();