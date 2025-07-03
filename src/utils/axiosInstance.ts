import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://192.168.251.49:5050/api',
});

export default instance;
