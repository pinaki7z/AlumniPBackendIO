// email/emailConfig.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  // host: 'smtp.gmail.com',
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send an email
const sendEmail = async (recipientEmail, templateName, data, subject) => {
    try {
      // Load and read the email template based on the templateName
      const templatePath = path.join(__dirname, `./templates/${templateName}.html`);
      let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  
      // Replace placeholders in the template with actual data
      for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        emailTemplate = emailTemplate.replace(regex, data[key]);
      }
  
      // Send the email using Nodemailer
      const info = await transporter.sendMail({
        from: 'AlumniPortal.com', // Sender address
        to: recipientEmail, // Recipient address
        subject: subject || 'Notification from Our Service', // Subject line
        html: emailTemplate, // HTML body
      });
  
      console.log('Email sent: %s', info.messageId);
      return info.messageId;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

module.exports = sendEmail;
