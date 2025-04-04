const { handler } = require('../src/index');
const { JiraService, ReportService } = require('../src/services');

jest.mock('../src/services', () => {
  const originalModule = jest.requireActual('../src/services');
  return {
    ...originalModule,
    JiraService: jest.fn(),
    ReportService: jest.fn()
  };
});

describe('Lambda Handler', () => {
  let mockJiraService;
  let mockReportService;

  beforeEach(() => {
    mockJiraService = { fetchTickets: jest.fn() };
    mockReportService = { generateReport: jest.fn() };
    JiraService.mockImplementation(() => mockJiraService);
    ReportService.mockImplementation(() => mockReportService);
  });

  test('dovrebbe restituire un codice 200 quando l\'esecuzione ha successo', async () => {
    mockReportService.generateReport.mockResolvedValue({
      CAF1: [{ key: 'SNDA-1' }],
      CAF2: [{ key: 'SNDA-2' }]
    });

    const result = await handler({ time: '2023-01-01T00:00:00.000Z' });

    expect(result.statusCode).toBe(200);
  });
});