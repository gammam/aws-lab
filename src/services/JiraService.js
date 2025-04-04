// services/jiraService.js
const axios = require('axios');

class JiraService {
  constructor(baseUrl, username, apiToken, logger) {
    this.logger = logger;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json'
      },
      timeout: 10000 // Timeout di 10 secondi
    });
  }

  async fetchTickets(jql) {
    const url = `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1000`;

    try {
      const response = await this.client.get(url);
      this.logger.info('Ticket recuperati con successo', { count: response.data.issues.length });
      return response.data.issues;
    } catch (error) {
      this.logger.error('Errore nel recupero dei ticket da Jira', error);
      throw new Error(`Impossibile recuperare i ticket: ${error.message}`);
    }
  }
}

module.exports = {
    JiraService
  };