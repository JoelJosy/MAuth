import transporter from "../config/nodemailer.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: {
        name: "MAuth Service",
        address: process.env.EMAIL_ID || "noreply@mauth.service",
      },
      to,
      subject,
      html,
      text, // Fallback for clients that don't support HTML
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      to,
      subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Failed to send email:", {
      error: error.message,
      to,
      subject,
    });

    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
