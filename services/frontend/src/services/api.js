import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getStatus = async () => {
    const response = await api.get('/status');
    return response.data;
};

export const startDigitalTwin = async (maxDevices = null) => {
    const response = await api.post('/start', {
        max_devices: maxDevices
    });
    return response.data;
};

export const stopDigitalTwin = async () => {
    const response = await api.post('/stop');
    return response.data;
};

export const reloadDigitalTwin = async (rsOnly = false, maxDevices = null) => {
    const response = await api.post('/reload', {
        rs_only: rsOnly,
        max_devices: maxDevices
    });
    return response.data;
};

export const getIxpConfig = async () => {
    const response = await api.get('/config/ixp');
    return response.data;
};

export const updateIxpConfig = async (config) => {
    const response = await api.put('/config/ixp', config);
    return response.data;
};

export const runQuarantineCheck = async (data) => {
    const response = await api.post('/quarantine/check', data);
    return response.data;
};

export default api;
