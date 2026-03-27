import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525');
const SMTP_USER = process.env.SMTP_USER || 'your-mailtrap-user';
const SMTP_PASS = process.env.SMTP_PASS || 'your-mailtrap-password';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: '"CC-Expense-Pro" <no-reply@cc-expense.pro>',
      ...options,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: 'Bem-vindo ao CC-Expense-Pro!',
    text: `Olá ${name},\n\nSua conta foi criada com sucesso. Comece a gerenciar suas finanças agora!`,
    html: `<p>Olá <strong>${name}</strong>,</p><p>Sua conta foi criada com sucesso. Comece a gerenciar suas finanças agora!</p>`,
  });
};

export const sendInvoiceClosedAlert = async (email: string, cardName: string) => {
    await sendEmail({
        to: email,
        subject: `Fatura do seu cartão ${cardName} fechou!`,
        text: `Olá,\n\nA fatura do seu cartão ${cardName} acabou de fechar. Acesse o app para ver os detalhes.`,
        html: `<p>Olá,</p><p>A fatura do seu cartão <strong>${cardName}</strong> acabou de fechar. Acesse o app para ver os detalhes.</p>`,
    })
}
