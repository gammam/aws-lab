const { ReportService } = require('../src/services/ReportService');

describe('ReportService', () => {
  let reportService;
  let mockJiraService;
  let mockLogger;

  beforeEach(() => {
    mockJiraService = {
      fetchTickets: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    reportService = new ReportService(mockJiraService, mockLogger);
  });

  test('generateReport dovrebbe generare una mappa CAF -> { caf, email, tickets, htmlReport }', async () => {
    const mockIssues = [
      {
        key: 'SNDA-1',
        fields: {
          customfield_10001: 'CAF1',
          summary: 'Issue 1',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
          reporter: { emailAddress: 'caf1@example.com' },
        },
      },
      {
        key: 'SNDA-2',
        fields: {
          customfield_10001: 'CAF2',
          summary: 'Issue 2',
          status: { name: 'Open' },
          priority: { name: 'Medium' },
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z',
          reporter: { emailAddress: 'caf2@example.com' },
        },
      },
      {
        key: 'SNDA-3',
        fields: {
          customfield_10001: 'CAF1',
          summary: 'Issue 3',
          status: { name: 'Closed' },
          priority: { name: 'Low' },
          created: '2023-01-05T00:00:00.000Z',
          updated: '2023-01-06T00:00:00.000Z',
          reporter: { emailAddress: 'caf1@example.com' },
        },
      },
    ];

    mockJiraService.fetchTickets.mockResolvedValue(mockIssues);

    const reportsByCAF = await reportService.generateReport('project = SNDA', 'customfield_10001');

    console.log('Reports by CAF:', reportsByCAF);
    
    // Verifica che la mappa contenga i CAF corretti
    expect(Object.keys(reportsByCAF)).toEqual(['CAF1', 'CAF2']);

    // Verifica i dettagli del CAF1
    expect(reportsByCAF['CAF1']).toEqual({
      caf: 'CAF1',
      email: 'caf1@example.com',
      tickets: [
        {
          key: 'SNDA-1',
          summary: 'Issue 1',
          status: 'In Progress',
          priority: 'High',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
        },
        {
          key: 'SNDA-3',
          summary: 'Issue 3',
          status: 'Closed',
          priority: 'Low',
          created: '2023-01-05T00:00:00.000Z',
          updated: '2023-01-06T00:00:00.000Z',
        },
      ],
      htmlReport: expect.any(String), // Verifica che il report HTML sia generato
    });

    // Verifica i dettagli del CAF2
    expect(reportsByCAF['CAF2']).toEqual({
      caf: 'CAF2',
      email: 'caf2@example.com',
      tickets: [
        {
          key: 'SNDA-2',
          summary: 'Issue 2',
          status: 'Open',
          priority: 'Medium',
          created: '2023-01-03T00:00:00.000Z',
          updated: '2023-01-04T00:00:00.000Z',
        },
      ],
      htmlReport: expect.any(String), // Verifica che il report HTML sia generato
    });
  });

  test('generateReport dovrebbe restituire un singolo report per un targetCaf specificato', async () => {
    const mockIssues = [
      {
        key: 'SNDA-1',
        fields: {
          customfield_10001: 'CAF1',
          summary: 'Issue 1',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
          reporter: { emailAddress: 'caf1@example.com' },
        },
      },
    ];

    mockJiraService.fetchTickets.mockResolvedValue(mockIssues);

    const { tickets, htmlReport } = await reportService.generateReport(
      'project = SNDA',
      'customfield_10001',
      'CAF1'
    );

    // Verifica i dettagli del report per CAF1
    expect(tickets).toEqual([
      {
        key: 'SNDA-1',
        summary: 'Issue 1',
        status: 'In Progress',
        priority: 'High',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-02T00:00:00.000Z',
      },
    ]);
    expect(htmlReport).toContain('<h2>CAF: CAF1</h2>');
    expect(htmlReport).toContain('<td>SNDA-1</td>');
    expect(htmlReport).toContain('<td>Issue 1</td>');
  });

  test('generateHtmlReport dovrebbe generare un report HTML valido', () => {
    const tickets = [
      {
        key: 'SNDA-1',
        summary: 'Issue 1',
        status: 'In Progress',
        priority: 'High',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-02T00:00:00.000Z',
      },
      {
        key: 'SNDA-2',
        summary: 'Issue 2',
        status: 'Open',
        priority: 'Medium',
        created: '2023-01-03T00:00:00.000Z',
        updated: '2023-01-04T00:00:00.000Z',
      },
    ];

    const htmlReport = reportService.generateHtmlReport('CAF1', tickets);

    // Verifica che il report HTML contenga i dati corretti
    expect(htmlReport).toContain('<h2>CAF: CAF1</h2>');
    expect(htmlReport).toContain('<td>SNDA-1</td>');
    expect(htmlReport).toContain('<td>Issue 1</td>');
    expect(htmlReport).toContain('<td>In Progress</td>');
    expect(htmlReport).toContain('<td>High</td>');
    expect(htmlReport).toContain('<td>2023-01-01T00:00:00.000Z</td>');
    expect(htmlReport).toContain('<td>SNDA-2</td>');
    expect(htmlReport).toContain('<td>Issue 2</td>');
    expect(htmlReport).toContain('<td>Open</td>');
    expect(htmlReport).toContain('<td>Medium</td>');
    expect(htmlReport).toContain('<td>2023-01-03T00:00:00.000Z</td>');
  });
});