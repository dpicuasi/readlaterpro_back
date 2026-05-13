const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.secure,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!env.email.user || !env.email.pass) {
    console.warn('[Email] Configuración de email no disponible, simulando envío...');
    console.log(`[Email] Para: ${to}, Asunto: ${subject}`);
    return { mock: true };
  }

  const info = await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
  });

  console.log(`[Email] Enviado a ${to}: ${info.messageId}`);
  return info;
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">¡Bienvenido a ReadLaterPro!</h2>
      <p style="color: #666;">Hola ${user.name},</p>
      <p style="color: #666;">Gracias por registrarte. Por favor verifica tu email haciendo clic en el botón:</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
        Verificar Email
      </a>
      <p style="color: #999; font-size: 12px;">Si no solicitaste este correo, ignóralo.</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Verifica tu email - ReadLaterPro',
    html,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Recuperar contraseña - ReadLaterPro</h2>
      <p style="color: #666;">Hola ${user.name},</p>
      <p style="color: #666;">Has solicitado recuperar tu contraseña. Haz clic en el botón:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
        Cambiar contraseña
      </a>
      <p style="color: #999; font-size: 12px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignóralo.</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Recuperar contraseña - ReadLaterPro',
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};