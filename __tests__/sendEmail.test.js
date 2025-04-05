const { handler } = require('../src/index');
const AwsService = require('../src/services/AwsService');
const JiraService = require('../src/services/JiraService');
const ReportService = require('../src/services/ReportService');

// Mock delle dipendenze
jest.mock('../src/services/AwsService');
jest.mock('../src/services/JiraService');
jest.mock('../src/services/ReportService');

describe('Handler - Invio email', () => {
  let mockSES;
  let mockJiraService;
  let mockReportService;

  beforeEach(() => {
    // Mock di AWS SES
    mockSES = {
      sendEmail: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
      }),
    };
    AwsService.mockImplementation(() => ({
      getSES: jest.fn().mockReturnValue(mockSES),
    }));

    // Mock di JiraService
    mockJiraService = {
      fetchTickets: jest.fn(),
    };
    JiraService.mockImplementation(() => mockJiraService);

    // Mock di ReportService
    mockReportService = {
      generateReport: jest.fn(),
      generateHtmlReport: jest.fn(),
    };
    ReportService.mockImplementation(() => mockReportService);

    // Mock delle variabili d'ambiente
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_USERNAME = 'test-user';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.EMAIL_SENDER = 'sender@example.com';
    process.env.CAF_FIELD_ID = 'customfield_10001';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Dovrebbe inviare un\'email per ogni gruppo CAF', async () => {
    // Mock dei dati di Jira
    const mockTicketsByCAF = {
      CAF1: [
        {
          key: 'SNDA-1',
          summary: 'Issue 1',
          status: 'In Progress',
          priority: 'High',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
          email: 'caf1@example.com',
        },
      ],
      CAF2: [
        {
          key: 'SNDA-2',
          summary: 'Issue 2',
          status: 'Open',
          priority: 'Medium',
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z',
          email: 'caf2@example.com',
        },
      ],
    };

    const mockHtmlReport = '<html><body>Report</body></html>';

    // Configura i mock
    mockReportService.generateReport.mockResolvedValue({ ticketsByCAF: mockTicketsByCAF });
    mockReportService.generateHtmlReport.mockReturnValue(mockHtmlReport);

    // Esegui il handler
    const event = { time: new Date().toISOString() };
    const context = { awsRequestId: 'test-request-id' };

    const result = await handler(event, context);

    // Verifica che le email siano state inviate
    expect(mockSES.sendEmail).toHaveBeenCalledTimes(2);

    expect(mockSES.sendEmail).toHaveBeenCalledWith({
      Source: 'sender@example.com',
      Destination: {
        ToAddresses: ['caf1@example.com'],
      },
      Message: {
        Subject: {
          Data: 'Report per CAF: CAF1',
        },
        Body: {
          Html: {
            Data: mockHtmlReport,
          },
        },
      },
    });

    expect(mockSES.sendEmail).toHaveBeenCalledWith({
      Source: 'sender@example.com',
      Destination: {
        ToAddresses: ['caf2@example.com'],
      },
      Message: {
        Subject: {
          Data: 'Report per CAF: CAF2',
        },
        Body: {
          Html: {
            Data: mockHtmlReport,
          },
        },
      },
    });

    // Verifica il risultato
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Report generati e inviati con successo',
      cafCount: 2,
      ticketCount: 2,
    });
  });

  test('Dovrebbe gestire errori durante l\'invio delle email', async () => {
    // Mock dei dati di Jira
    const mockTicketsByCAF = {
      CAF1: [
        {
          key: 'SNDA-1',
          summary: 'Issue 1',
          status: 'In Progress',
          priority: 'High',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
          email: 'caf1@example.com',
        },
      ],
    };

    const mockHtmlReport = '<html><body>Report</body></html>';

    // Configura i mock
    mockReportService.generateReport.mockResolvedValue({ ticketsByCAF: mockTicketsByCAF });
    mockReportService.generateHtmlReport.mockReturnValue(mockHtmlReport);

    // Simula un errore durante l'invio dell'email
    mockSES.sendEmail.mockReturnValueOnce({
      promise: jest.fn().mockRejectedValue(new Error('Errore invio email')),
    });

    // Esegui il handler
    const event = { time: new Date().toISOString() };
    const context = { awsRequestId: 'test-request-id' };

    const result = await handler(event, context);

    // Verifica che l'errore sia stato gestito
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Errore durante la generazione dei report',
      message: 'Errore invio email',
      stack: expect.any(String),
    });

    // Verifica che l'email sia stata tentata
    expect(mockSES.sendEmail).toHaveBeenCalledTimes(1);
  });
});