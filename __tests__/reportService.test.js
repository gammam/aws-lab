const { ReportService } = require('../src/services/ReportService');

describe('ReportService', () => {
  let reportService;
  let mockJiraService;
  let mockLogger;

  beforeEach(() => {
    mockJiraService = {
      fetchTickets: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    reportService = new ReportService(mockJiraService, mockLogger);
  });

  test('generateReport should group tickets by CAF and generate an HTML report', async () => {
    const mockIssues = [
      {
        key: 'SNDA-1',
        fields: {
          customfield_10001: 'CAF1',
          summary: 'Issue 1',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z'
        }
      },
      {
        key: 'SNDA-2',
        fields: {
          customfield_10001: 'CAF2',
          summary: 'Issue 2',
          status: { name: 'Open' },
          priority: { name: 'Medium' },
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z'
        }
      },
      {
        key: 'SNDA-3',
        fields: {
          customfield_10001: 'CAF1',
          summary: 'Issue 3',
          status: { name: 'Closed' },
          priority: { name: 'Low' },
          created: '2023-01-05T00:00:00.000Z',
          updated: '2023-01-06T00:00:00.000Z'
        }
      }
    ];

    mockJiraService.fetchTickets.mockResolvedValue(mockIssues);

    const { ticketsByCAF, htmlReport } = await reportService.generateReport('project = SNDA', 'customfield_10001');

    // Verify ticketsByCAF
    expect(ticketsByCAF).toEqual({
      CAF1: [
        {
          key: 'SNDA-1',
          summary: 'Issue 1',
          status: 'In Progress',
          priority: 'High',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z'
        },
        {
          key: 'SNDA-3',
          summary: 'Issue 3',
          status: 'Closed',
          priority: 'Low',
          created: '2023-01-05T00:00:00.000Z',
          updated: '2023-01-06T00:00:00.000Z'
        }
      ],
      CAF2: [
        {
          key: 'SNDA-2',
          summary: 'Issue 2',
          status: 'Open',
          priority: 'Medium',
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z'
        }
      ]
    });

    // Verify HTML report
    expect(htmlReport).toContain('<h1>Customer Report</h1>');
    expect(htmlReport).toContain('<h2>CAF: CAF1</h2>');
    expect(htmlReport).toContain('<h2>CAF: CAF2</h2>');
    expect(htmlReport).toContain('<td>SNDA-1</td>');
    expect(htmlReport).toContain('<td>Issue 1</td>');
    expect(htmlReport).toContain('<td>In Progress</td>');
    expect(htmlReport).toContain('<td>High</td>');
    expect(htmlReport).toContain('<td>2023-01-01T00:00:00.000Z</td>');
    expect(htmlReport).toContain('<td>2023-01-02T00:00:00.000Z</td>');
  });

  test('generateHtmlReport should create a valid HTML report', () => {
    const ticketsByCAF = {
      CAF1: [
        {
          key: 'SNDA-1',
          summary: 'Issue 1',
          status: 'In Progress',
          priority: 'High',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z'
        }
      ],
      CAF2: [
        {
          key: 'SNDA-2',
          summary: 'Issue 2',
          status: 'Open',
          priority: 'Medium',
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z'
        }
      ]
    };

    const htmlReport = reportService.generateHtmlReport(ticketsByCAF);

    // Verify HTML structure
    expect(htmlReport).toContain('<h1>Customer Report</h1>');
    expect(htmlReport).toContain('<h2>CAF: CAF1</h2>');
    expect(htmlReport).toContain('<h2>CAF: CAF2</h2>');
    expect(htmlReport).toContain('<td>SNDA-1</td>');
    expect(htmlReport).toContain('<td>Issue 1</td>');
    expect(htmlReport).toContain('<td>In Progress</td>');
    expect(htmlReport).toContain('<td>High</td>');
    expect(htmlReport).toContain('<td>2023-01-01T00:00:00.000Z</td>');
    expect(htmlReport).toContain('<td>2023-01-02T00:00:00.000Z</td>');
  });
});