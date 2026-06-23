import apiClient from "../utils/apiClient";

apiClient.interceptors.request.use((config) => {
  const url = config.url || "";

  if (url.startsWith("/api/")) {
    config.url = url.slice(4);
  }

  return config;
});

export default apiClient;
