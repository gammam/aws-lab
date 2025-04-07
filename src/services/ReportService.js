// services/reportService.js
class ReportService {
  constructor(jiraService, logger) {
    this.jiraService = jiraService;
    this.logger = logger;
  }

  async generateReport(jql, cafFieldId = 'customfield_10001', targetCaf = null) {
    this.logger.info('Recupero ticket da Jira', { jql });

    let issues = await this.jiraService.fetchTickets(jql);

    // Mappa per contenere i report per ogni CAF
    const reportsByCAF = {};

    issues.forEach(issue => {
      this.logger.info('check type: ',issue)
      const cafValue = issue.components ;
      const email = 'default@example.com'; // Email associata al CAF
 // console.log('CAF:', cafValue);
      
      if (!reportsByCAF[cafValue]) {
        reportsByCAF[cafValue] = {
          caf: cafValue,
          email: email,
          tickets: [],
        };
      }

      reportsByCAF[cafValue].tickets.push({
        key: issue.key,
        summary: issue.summary,
        status: issue.status,
        priority: issue.priority,
      });
    });

    this.logger.info('Ticket raggruppati per CAF', {
      totalCAFs: Object.keys(reportsByCAF).length,
      totalTickets: issues.length,
      distribution: Object.fromEntries(
        Object.entries(reportsByCAF).map(([caf, data]) => [caf, data.tickets.length])
      ),
    });

    // Genera il report HTML per ogni CAF
    for (const [caf, data] of Object.entries(reportsByCAF)) {
      data.htmlReport = this.generateHtmlReport(caf, data.tickets);
    }

    // Altrimenti, restituisci la mappa completa
    return reportsByCAF;
  }

  generateHtmlReport(caf, tickets) {

    // Genera il report HTML
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Report - CAF: ${caf}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          h2 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Customer Report</h1>
        <h2>CAF: ${caf}</h2>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
    `;

    tickets.forEach(ticket => {
      html += `
        <tr>
          <td>${ticket.key}</td>
          <td>${ticket.summary}</td>
          <td>${ticket.status}</td>
          <td>${ticket.priority}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    return html;
  }
}

module.exports = ReportService;