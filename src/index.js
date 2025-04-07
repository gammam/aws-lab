const AwsService = require('./services/AwsService');
const JiraService = require('./services/JiraService');
const ReportService = require('./services/ReportService');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // Importa il modulo archiver

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
        const featureFlagEmail = process.env.FEATURE_FLAG_EMAIL === 'false'; // Feature flag

        if (!jiraBaseUrl || !jiraUsername || !jiraApiToken || !emailSender) {
            throw new Error('Variabili d\'ambiente mancanti o incomplete');
        }

        // JQL per ottenere tutti i ticket
        const jql = 'project = SNDA AND type = Bug AND status = Pending ORDER BY created DESC';

        const jiraService = new JiraService(jiraBaseUrl, jiraUsername, jiraApiToken, logger);
        const reportService = new ReportService(jiraService, logger);
      
        // Genera i report raggruppati per CAF
        const { ticketsByCAF } = await reportService.generateReport(jql, cafFieldId);

        // Genera il report per CAF1
        const { tickets, htmlReport } = await reportService.generateReport(jql, 'customfield_10001', 'CAF1');
        console.log(htmlReport); // Mostra il report HTML per CAF1

        if (featureFlagEmail) {
            // Invia un'email per ogni gruppo CAF
            const awsService = new AwsService();
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
        } else {
            // Salva i report sul filesystem e crea un file ZIP
            const outputDir = path.join(__dirname, 'reports');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            const zipFilePath = path.join(__dirname, 'reports.zip');
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                logger.info(`File ZIP creato con successo: ${zipFilePath} (${archive.pointer()} byte)`);
            });

            archive.on('error', (err) => {
                throw err;
            });

            archive.pipe(output);

            for (const [caf, tickets] of Object.entries(ticketsByCAF)) {
                const htmlReport = reportService.generateHtmlReport({ [caf]: tickets });
                const fileName = `report_${caf}.html`;

                // Aggiungi il report al file ZIP
                archive.append(htmlReport, { name: fileName });
                logger.info(`Report aggiunto al file ZIP: ${fileName}`);
            }

            await archive.finalize();
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: featureFlagEmail
                    ? 'Report generati e inviati con successo'
                    : 'Report generati e salvati in un file ZIP con successo',
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