import { Contact } from "../../DB/models/contactUs.model.js";

export const createContactMessage = async (payload) => {
  const { name, email, subject, message } = payload;

  if (!name || !email || !message) {
    throw new Error("Missing required fields", { cause: 400 });
  }

  const contact = await Contact.create({
    name: name.trim(),
    email: email.trim(),
    subject: subject?.trim() || "General",
    message: message.trim(),
  });

  return contact;
};