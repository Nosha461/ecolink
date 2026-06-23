import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

export async function sendContactMessage({ name, email, subject, message }) {
  const response = await apiClient.post(API_ENDPOINTS.contact.root, {
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
  });

  return response.data?.data || response.data;
}
