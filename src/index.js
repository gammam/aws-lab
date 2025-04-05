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
        const emailSender = process.env.EMAIL_SENDER;
        const cafFieldId = process.env.CAF_FIELD_ID || 'customfield_10001';

        if (!jiraBaseUrl || !jiraUsername || !jiraApiToken || !emailSender) {
            throw new Error('Variabili d\'ambiente mancanti o incomplete');
        }

        // JQL per ottenere tutti i ticket
        const jql = 'project = SNDA AND type = Bug AND status = Pending ORDER BY created DESC';

        const jiraService = new JiraService(jiraBaseUrl, jiraUsername, jiraApiToken, logger);
        const reportService = new ReportService(jiraService, logger);
        const awsService = new AwsService();

        // Genera i report raggruppati per CAF
        const { ticketsByCAF, htmlReport } = await reportService.generateReport(jql, cafFieldId);

        // Invia un'email per ogni gruppo CAF
        for (const [caf, tickets] of Object.entries(ticketsByCAF)) {
            const htmlReport = reportService.generateHtmlReport({ [caf]: tickets });

            const emailParams = {
                Source: emailSender,
                Destination: {
                    ToAddresses: [tickets[0]?.email || 'm.gammaldi@gmail.com'], // Usa un'email di default se non specificata
                },
                Message: {
                    Subject: {
                        Data: `Report per CAF: ${caf}`,
                    },
                    Body: {
                        Html: {
                            Data: htmlReport,
                        },
                    },
                },
            };

            await awsService.getSES().sendEmail(emailParams).promise();
            logger.info(`Email inviata con successo per CAF: ${caf}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Report generati e inviati con successo',
                cafCount: Object.keys(ticketsByCAF).length,
                ticketCount: Object.values(ticketsByCAF).reduce((acc, tickets) => acc + tickets.length, 0),
            }),
        };

    } catch (error) {
        logger.error('Errore fatale nella generazione dei report', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Errore durante la generazione dei report',
                message: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            }),
        };
    }
}

module.exports = {
    handler,
};