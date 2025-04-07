const nodemailer = require('nodemailer');

class MailtrapService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT || 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  async sendEmail(emailParams) {
    const mailOptions = {
      from: emailParams.Source,
      to: emailParams.Destination.ToAddresses.join(','),
      subject: emailParams.Message.Subject.Data,
      html: emailParams.Message.Body.Html.Data,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email inviata con successo:', info.messageId);
      return info;
    } catch (error) {
      console.error('Errore durante l\'invio dell\'email:', error);
      throw error;
    }
  }
}

module.exports = MailtrapService;