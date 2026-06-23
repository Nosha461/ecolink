// // Email utilities - to be implemented (e.g. nodemailer, SendGrid)
// export const sendEmail = async ({ to, subject, html }) => {
//   // TODO: implement
//   console.log('sendEmail stub:', { to, subject });
//   return true;
// };

// export const sendVerificationEmail = async (user, link) => {
//   // TODO: implement
//   return sendEmail({
//     to: user.email,
//     subject: 'Verify your email',
//     html: `Verify: ${link}`,
//   });
// };


import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async ({ to, subject, html }) => {

  console.log("TRYING TO SEND EMAIL TO:", to);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  console.log("EMAIL SENT:", info.response);

  return info;
};