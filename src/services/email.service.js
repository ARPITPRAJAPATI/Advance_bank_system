
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"advance_backend" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendRegistrationEmail(userEmail, name) {
    const subject = "Welcome to Advance Backend 🚀";

    const text = `Hello ${name}, thank you for registering on our platform.`;

    const html = `
    <div style="font-family: Arial; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden;">
        
        <div style="background:#111827; color:white; padding:20px; text-align:center;">
          <h1>Welcome 🚀</h1>
        </div>

        <div style="padding:20px;">
          <h2>Hello ${name}, 👋</h2>
          <p>Thank you for registering on our platform.</p>
          <p>We’re excited to have you on board 🎉</p>

          <div style="text-align:center; margin:20px;">
            <a href="http://localhost:5173"
              style="background:#4f46e5; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">
              Get Started
            </a>
          </div>

          <p>Cheers,<br><b>Advance Backend Team</b></p>
        </div>

      </div>
    </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}



module.exports = {sendRegistrationEmail };


