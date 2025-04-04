// customer-report.test.js
const AWS = require('aws-sdk');
const axios = require('axios');

// Accedi direttamente all'oggetto handler dalla funzione che stai testando
const { handler } = require('../src/index');

// Mock completi per AWS e axios
jest.mock('aws-sdk');
jest.mock('axios');

jest.mock('axios');
const axios = require('axios');




describe('CustomerReport Lambda Function', () => {
  let mockS3GetObject, mockSESSendEmail, mockAxiosGet;

  beforeEach(() => {
    // Reset di tutti i mock all'inizio di ogni test
    jest.clearAllMocks();
    
    // Mock delle variabili d'ambiente necessarie
    process.env.JIRA_BASE_URL = 'https://test-jira.atlassian.net';
    process.env.JIRA_USERNAME = 'test-user';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.CONFIG_BUCKET = 'test-bucket';
    process.env.EMAIL_SENDER = 'test@example.com';
    process.env.CAF_FIELD_ID = 'customfield_10001';


    // Dati di esempio per i test
    const mockJiraResponse = {
      data: {
        issues: [
          {
            key: 'SM-123',
            fields: {
              customfield_10001: 'CAF1',
              summary: 'Test ticket 1',
              status: { name: 'Open' },
              priority: { name: 'Medium' },
              created: '2025-04-01T10:00:00.000Z',
              updated: '2025-04-02T14:30:00.000Z',
            },
          },
          {
            key: 'SM-124',
            fields: {
              customfield_10001: 'CAF2',
              summary: 'Test ticket 2',
              status: { name: 'In Progress' },
              priority: { name: 'High' },
              created: '2025-04-02T09:15:00.000Z',
              updated: '2025-04-03T11:45:00.000Z',
            },
          },
        ],
      }
    };

    const mockS3Response = {
      Body: Buffer.from(
        JSON.stringify({
          CAF1: { email: 'test1@example.com' },
          CAF2: { email: 'test2@example.com' },
        })
      ),
    };

    // Mock completi per axios.create e il suo metodo get
    mockAxiosGet = jest.fn().mockResolvedValue(mockJiraResponse);
    
    // Questa è la parte cruciale: prima cancelliamo l'implementazione attuale
    // e poi creiamo un nuovo mock che restituisce un oggetto con get e altre proprietà
    axios.create.mockImplementation(() => {
      return {
        get: mockAxiosGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        defaults: { headers: { common: {} } }
      };
    });

    // Mock per S3.getObject
    mockS3GetObject = jest.fn().mockResolvedValue(mockS3Response);
    const mockS3 = {
      getObject: jest.fn().mockReturnValue({
        promise: mockS3GetObject
      })
    };
    AWS.S3.mockImplementation(() => mockS3);

    // Mock per SES.sendEmail
    mockSESSendEmail = jest.fn().mockResolvedValue({ MessageId: 'test-message-id' });
    const mockSES = {
      sendEmail: jest.fn().mockReturnValue({
        promise: mockSESSendEmail
      })
    };
    AWS.SES.mockImplementation(() => mockSES);
  });

  test('Dovrebbe elaborare correttamente i ticket e inviare i report', async () => {
    // Evento di input per la funzione Lambda
    const event = {
      time: new Date().toISOString(),
      detail: {}
    };

    // Contesto Lambda
    const context = {
      awsRequestId: 'test-request-id',
      functionName: 'CustomerReport'
    };

    // Aggiunta per completare la funzione handler
    const expectedOutput = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Report generati e inviati con successo'
      })
    };
    
    // Esegui il test con mock per il return finale se necessario
    const result = await handler.fetchJiraTickets(jql|null);
    
    // Verifica che il risultato sia corretto (adatta se necessario)
    expect(result).toEqual(expectedOutput);
    
    // Verifica che le funzioni mockata siano state chiamate
    expect(mockAxiosGet).toHaveBeenCalled();
  });

  test('Dovrebbe gestire correttamente gli errori di Jira', async () => {
    // Simula un errore nell'API di Jira
    mockAxiosGet.mockRejectedValueOnce(new Error('Jira API Error'));

    const event = { time: new Date().toISOString() };
    const context = { awsRequestId: 'test-error-id' };
    
    const result = await handler(event, context);

    
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Impossibile recuperare i ticket');
  });
});