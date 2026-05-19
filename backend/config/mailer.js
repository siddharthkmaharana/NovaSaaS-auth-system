import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌  Nodemailer Config Error:', error);
    } else {
        console.log('✅  Nodemailer is ready to send emails');
    }
});

export const sendVerificationEmail = async ({ name, email, token }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/verify/${token}`;

    const mailOptions = {
        from: `"NovaSaaS" <${process.env.MAIL_USER}>`,
        to: email,
        subject: '⚡ Verify your email - NovaSaaS',
        text: `Hello ${name},\n\nThank you for signing up for early access to NovaSaaS. Please verify your email by clicking the link below:\n\n${verificationUrl}\n\nThis verification link will expire in 24 hours.\n\nIf you did not request this, you can safely ignore this email.`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              background-color: #050810;
              color: #e2e8f0;
              font-family: 'DM Sans', sans-serif;
              padding: 40px 20px;
              margin: 0;
            }
            .card {
              background-color: #0d1220;
              border: 1px solid rgba(99,179,237,0.15);
              border-radius: 8px;
              padding: 30px;
              max-width: 500px;
              margin: 0 auto;
              text-align: center;
            }
            h1 {
              color: #ffffff;
              font-family: 'Orbitron', sans-serif;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              color: #cbd5e1;
              font-size: 16px;
              line-height: 1.5;
            }
            .btn {
              display: inline-block;
              background-color: #00f5d4;
              color: #050810;
              text-decoration: none;
              padding: 12px 30px;
              font-weight: bold;
              border-radius: 4px;
              margin: 25px 0;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              box-shadow: 0 0 15px rgba(0,245,212,0.4);
            }
            .btn:hover {
              box-shadow: 0 0 25px rgba(0,245,212,0.7);
            }
            .footer {
              color: #64748b;
              font-size: 12px;
              margin-top: 30px;
            }
            .expiry {
              color: #7c3aed;
              font-size: 13px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚡ NovaSaaS</h1>
            <p>Hello ${name},</p>
            <p>Thank you for signing up for early access to NovaSaaS. Please verify your email address to secure your spot and access your dashboard.</p>
            <a href="${verificationUrl}" class="btn">Verify My Email</a>
            <p class="expiry">This verification link will expire in 24 hours.</p>
            <p class="footer">If you did not request this, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
        `
    };

    return transporter.sendMail(mailOptions);
};

