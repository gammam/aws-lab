const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { handler } = require('../src/index');
const JiraService = require('../src/services/JiraService');
const ReportService = require('../src/services/ReportService');
const AwsService = require('../src/services/AwsService');

// Mock delle dipendenze
jest.mock('fs');
jest.mock('archiver');
jest.mock('../src/services/JiraService');
jest.mock('../src/services/ReportService');
jest.mock('../src/services/AwsService');

describe('Handler - FEATURE_FLAG_EMAIL=false', () => {
  let mockJiraService;
  let mockReportService;

  beforeEach(() => {
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

    // Mock del filesystem
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.createWriteStream.mockReturnValue({
      on: jest.fn(),
      end: jest.fn(),
    });

    // Mock di archiver
    archiver.mockReturnValue({
      pipe: jest.fn(),
      append: jest.fn(),
      finalize: jest.fn().mockResolvedValue(),
      on: jest.fn(),
    });

    // Mock delle variabili d'ambiente
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_USERNAME = 'test-user';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.EMAIL_SENDER = 'sender@example.com';
    process.env.CAF_FIELD_ID = 'customfield_10001';
    process.env.FEATURE_FLAG_EMAIL = 'false';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Dovrebbe salvare i report in un file ZIP quando FEATURE_FLAG_EMAIL=false', async () => {
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

    // Verifica che la directory sia stata creata
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('reports'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('reports'));

    // Verifica che il file ZIP sia stato creato
    expect(fs.createWriteStream).toHaveBeenCalledWith(expect.stringContaining('reports.zip'));

    // Verifica che i report siano stati aggiunti al file ZIP
    const archiveInstance = archiver.mock.results[0].value;
    expect(archiveInstance.append).toHaveBeenCalledTimes(2);
    expect(archiveInstance.append).toHaveBeenCalledWith(mockHtmlReport, { name: 'report_CAF1.html' });
    expect(archiveInstance.append).toHaveBeenCalledWith(mockHtmlReport, { name: 'report_CAF2.html' });

    // Verifica che il file ZIP sia stato finalizzato
    expect(archiveInstance.finalize).toHaveBeenCalled();

    // Verifica il risultato
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Report generati e salvati in un file ZIP con successo',
      cafCount: 2,
      ticketCount: 2,
    });
  });
});