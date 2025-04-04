// services/reportService.js
class ReportService {
  constructor(jiraService, logger) {
    this.jiraService = jiraService;
    this.logger = logger;
  }

  async generateReport(jql, cafFieldId = 'customfield_10001') {
    this.logger.info('Recupero ticket da Jira', { jql });

    let issues = await this.jiraService.fetchTickets(jql);

    // Raggruppare ticket per CAF
    const ticketsByCAF = {};

    issues.forEach(issue => {
      const cafValue = issue.fields[cafFieldId] || 'Non Assegnato';

      if (!ticketsByCAF[cafValue]) {
        ticketsByCAF[cafValue] = [];
      }

      ticketsByCAF[cafValue].push({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name || 'Non definita',
        created: issue.fields.created,
        updated: issue.fields.updated
      });
    });

    this.logger.info('Ticket raggruppati per CAF', {
      totalCAFs: Object.keys(ticketsByCAF).length,
      totalTickets: issues.length,
      distribution: Object.fromEntries(
        Object.entries(ticketsByCAF).map(([caf, tickets]) => [caf, tickets.length])
      )
    });

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(ticketsByCAF);

    return { ticketsByCAF, htmlReport };
  }

  generateHtmlReport(ticketsByCAF) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Report</title>
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
    `;

    for (const [caf, tickets] of Object.entries(ticketsByCAF)) {
      html += `
        <h2>CAF: ${caf}</h2>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Updated</th>
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
            <td>${ticket.created}</td>
            <td>${ticket.updated}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }
}

module.exports = {
  ReportService
};