import axios from "axios";

const API = axios.create({
  baseURL: "https://collab-platform-backend-31r8.onrender.com/api"
});

export default API;
