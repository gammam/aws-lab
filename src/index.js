const AwsService = require('./services/AwsService');
const MailtrapService = require('./services/MailtrapService'); // Nuovo servizio per Mailtrap
const JiraService = require('./services/JiraService');
const ReportService = require('./services/ReportService');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // Importa il modulo archiver
const { createLogger, format, transports } = require('winston');

require('dotenv').config(); // Carica le variabili d'ambiente dal file .env

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message, ...meta }) => {
            const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
        })
    ),
    transports: [
        new transports.Console(),
    ],
});

async function handler(event, context) {
    try {
        logger.info('Inizio generazione CustomerReport', { eventTime: event.time });

        // Recupera dati di accesso a Jira da variabili d'ambiente
        const jiraBaseUrl = process.env.JIRA_BASE_URL;
        const jiraUsername = process.env.JIRA_USERNAME;
        const jiraApiToken = process.env.JIRA_API_TOKEN;
        const emailSender = process.env.EMAIL_SENDER;
        const emailServiceProvider = process.env.EMAIL_SERVICE_PROVIDER || 'aws'; // Feature flag
        const cafFieldId = process.env.CAF_FIELD_ID || 'type';
        const featureFlagEmail = process.env.FEATURE_FLAG_EMAIL  || 'true'; // Feature flag

        console.log('emailSender', emailSender);

        if (!jiraBaseUrl || !jiraUsername || !jiraApiToken || !emailSender) {
            throw new Error('Variabili d\'ambiente mancanti o incomplete');
        }

        // JQL per ottenere tutti i ticket
        const jql = 'project = SNDA AND type = Bug AND status = Pending ORDER BY created DESC';

        const jiraService = new JiraService(jiraBaseUrl, jiraUsername, jiraApiToken, logger);
        const reportService = new ReportService(jiraService, logger);
      
        // Genera i report raggruppati per CAF
        const ticketsByCAF  = await reportService.generateReport(jql, cafFieldId);

        console.log('ticketsByCAF', ticketsByCAF);
        if (featureFlagEmail) {
            // Seleziona il servizio di invio email in base al feature flag
            let emailService;
            if (emailServiceProvider === 'aws') {
                emailService = new AwsService();
            } else if (emailServiceProvider === 'mailtrap') {
                emailService = new MailtrapService();
            } else {
                throw new Error(`Servizio email non supportato: ${emailServiceProvider}`);
            }

            // Invia un'email per ogni gruppo CAF
            for (const [caf, data] of Object.entries(ticketsByCAF)) {
                
                const htmlReport = data.htmlReport;

                const emailParams = {
                    Source: emailSender,
                    Destination: {
                        ToAddresses: [data.email || 'm.gammaldi@gmail.com'], // Usa un'email di default se non specificata
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

                await emailService.sendEmail(emailParams);
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