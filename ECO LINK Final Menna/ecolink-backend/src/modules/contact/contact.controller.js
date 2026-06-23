import { createContactMessage } from "./contact.service.js";

export const sendContactMessage = async (req, res, next) => {
  try {
    const contact = await createContactMessage(req.body);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: contact,
    });
  } catch (err) {
    next(err);
  }
};