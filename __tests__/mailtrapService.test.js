const MailtrapService = require('../src/services/MailtrapService');
const nodemailer = require('nodemailer');

// Mock di nodemailer
jest.mock('nodemailer');

describe('MailtrapService', () => {
  let mailtrapService;
  let mockTransporter;

  beforeEach(() => {
    // Mock del transporter di nodemailer
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);

    // Inizializza il servizio Mailtrap
    mailtrapService = new MailtrapService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Dovrebbe inviare un\'email con successo', async () => {
    const emailParams = {
      Source: 'noreply@example.com',
      Destination: {
        ToAddresses: ['recipient@example.com'],
      },
      Message: {
        Subject: {
          Data: 'Test Email',
        },
        Body: {
          Html: {
            Data: '<h1>Test Email</h1><p>This is a test email sent via Mailtrap.</p>',
          },
        },
      },
    };

    const result = await mailtrapService.sendEmail(emailParams);

    // Verifica che nodemailer.createTransport sia stato chiamato con i parametri corretti
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: process.env.MAILTRAP_HOST,
      port: parseInt(process.env.MAILTRAP_PORT, 10),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });

    // Verifica che sendMail sia stato chiamato con i parametri corretti
    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: emailParams.Source,
      to: emailParams.Destination.ToAddresses.join(','),
      subject: emailParams.Message.Subject.Data,
      html: emailParams.Message.Body.Html.Data,
    });

    // Verifica il risultato
    expect(result).toEqual({ messageId: 'test-message-id' });
  });

  test('Dovrebbe gestire un errore durante l\'invio dell\'email', async () => {
    const emailParams = {
      Source: 'noreply@example.com',
      Destination: {
        ToAddresses: ['recipient@example.com'],
      },
      Message: {
        Subject: {
          Data: 'Test Email',
        },
        Body: {
          Html: {
            Data: '<h1>Test Email</h1><p>This is a test email sent via Mailtrap.</p>',
          },
        },
      },
    };

    // Simula un errore durante l'invio dell'email
    mockTransporter.sendMail.mockRejectedValue(new Error('Errore durante l\'invio dell\'email'));

    await expect(mailtrapService.sendEmail(emailParams)).rejects.toThrow('Errore durante l\'invio dell\'email');

    // Verifica che sendMail sia stato chiamato
    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: emailParams.Source,
      to: emailParams.Destination.ToAddresses.join(','),
      subject: emailParams.Message.Subject.Data,
      html: emailParams.Message.Body.Html.Data,
    });
  });
});