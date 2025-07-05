import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://192.168.31.129:5050/api',
});

export default instance;
