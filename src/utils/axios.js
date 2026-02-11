// axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://campusqr-4.onrender.com", // Backend server URL
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
