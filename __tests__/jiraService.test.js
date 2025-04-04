const { JiraService } = require('../src/services/JiraService');
const axios = require('axios');

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn()
  }))
}));

describe('JiraService', () => {
  let jiraService;
  let mockLogger;
  let mockAxiosInstance;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    mockAxiosInstance = {
      get: jest.fn()
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    jiraService = new JiraService('https://jira.example.com', 'username', 'token', mockLogger);
  });

  test('il costruttore dovrebbe configurare correttamente il client axios', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://jira.example.com',
      headers: {
        'Authorization': expect.stringContaining('Basic '),
        'Accept': 'application/json'
      },
      timeout: 10000
    });
  });

  test('fetchTickets dovrebbe restituire i ticket quando la chiamata ha successo', async () => {
    const mockResponse = {
      data: {
        issues: [
          { id: '1', key: 'SNDA-1' },
          { id: '2', key: 'SNDA-2' }
        ]
      }
    };
    
    mockAxiosInstance.get.mockResolvedValue(mockResponse);
    
    const result = await jiraService.fetchTickets('project = SNDA');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/rest/api/3/search?jql=project%20%3D%20SNDA&maxResults=1000'
    );
    expect(result).toEqual(mockResponse.data.issues);
  });
});