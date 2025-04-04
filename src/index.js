const AwsService = require('./services/AwsService');
const JiraService = require('./services/JiraService');
const ReportService = require('./services/ReportService');

async function handler(event, context) {
    const logger = new Logger();
    
    try {
      logger.info('Inizio generazione CustomerReport', { eventTime: event.time });
  
      // Recupera dati di accesso a Jira da variabili d'ambiente
      const jiraBaseUrl = process.env.JIRA_BASE_URL;
      const jiraUsername = process.env.JIRA_USERNAME;
      const jiraApiToken = process.env.JIRA_API_TOKEN;
  
      if (!jiraBaseUrl || !jiraUsername || !jiraApiToken) {
        throw new Error('Variabili d\'ambiente per Jira mancanti o incomplete');
      }
  
      // JQL per ottenere tutti i ticket
      const jql = 'project = SNDA AND type = Bug AND status = Pending ORDER BY created DESC';
      const cafFieldId = process.env.CAF_FIELD_ID || 'customfield_10001';
  
      const jiraService = new JiraService(jiraBaseUrl, jiraUsername, jiraApiToken, logger);
      const reportService = new ReportService(jiraService, logger);
      
      const ticketsByCAF = await reportService.generateReport(jql, cafFieldId);
      
      // Resto della logica...
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Report generato con successo',
          cafCount: Object.keys(ticketsByCAF).length,
          ticketCount: Object.values(ticketsByCAF).reduce((acc, tickets) => acc + tickets.length, 0)
        })
      };
  
    } catch (error) {
      logger.error('Errore fatale nella generazione dei report', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Errore durante la generazione dei report',
          message: error.message,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        })
      };
    }
  }
  
  module.exports = {
    handler,
  };