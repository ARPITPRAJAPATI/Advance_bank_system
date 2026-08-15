
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
      from: `"Kube Pay" <${process.env.EMAIL_USER}>`, // sender address
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
    const subject = "Welcome to Kube Pay 🚀";

    const text = `Hello ${name}, thank you for registering on Kube Pay.`;

    const html = `
    <div style="font-family: Arial; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden;">
        
        <div style="background:#111827; color:white; padding:20px; text-align:center;">
          <h1>Welcome to Kube Pay 🚀</h1>
        </div>

        <div style="padding:20px;">
          <h2>Hello ${name}, 👋</h2>
          <p>Thank you for registering on our platform.</p>
          <p>We’re excited to have you on board 🎉</p>

          <div style="text-align:center; margin:20px;">
            <a href="http://localhost:8000"
              style="background:#4f46e5; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">
              Get Started
            </a>
          </div>

          <p>Cheers,<br><b>Kube Pay Team</b></p>
        </div>

      </div>
    </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}
async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    const subject = "Kube Pay Transaction Alert 🚨";
    const text = `Hello ${name}, a transaction of ₹${amount} has been made to account ${toAccount}.`;
    const html = `
      <div style="font-family: Arial; background:#f4f4f4; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden;">
          
          <div style="background:#111827; color:white; padding:20px; text-align:center;">
            <h1>Transaction Alert 🚨</h1>
          </div>

          <div style="padding:20px;">
            <h2>Hello ${name}, 👋</h2>
            <p>A transaction has been made on your account.</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>To Account:</strong> ${toAccount}</p>
          </div>
        </div>
      </div>
    `;
    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    const subject = "Kube Pay Transaction Alert 🚨";
    const text = `Hello ${name}, a transaction of ₹${amount} has failed.`;
    const html = `
      <div style="font-family: Arial; background:#f4f4f4; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden;">
          <div style="padding:20px;">
            <h2>Transaction Failed</h2>
            <p>Your transfer of ₹${amount} to account ${toAccount} could not be completed.</p>
          </div>
        </div>
      </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}

module.exports = {
     sendRegistrationEmail,
     sendTransactionEmail,
     sendTransactionFailureEmail
};
