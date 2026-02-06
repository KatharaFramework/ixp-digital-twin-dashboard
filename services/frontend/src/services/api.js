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

export const listResourceFiles = async () => {
    const response = await api.get('/resources/files');
    return response.data;
};

export const uploadResourceFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/resources/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const runQuarantineCheck = async (data) => {
    const response = await api.post('/quarantine/check', data);
    return response.data;
};

export const getMachinesStats = async () => {
    const response = await api.get('/machines/stats');
    return response.data;
};

export const executeMachineCommand = async (machineName, command) => {
    const response = await api.post('/machines/exec', {
        machine_name: machineName,
        command: command
    });
    return response.data;
};

export const compareRib = async (routeServer, resourceFile) => {
    const response = await api.post('/rib/compare', {
        route_server: routeServer,
        resource_file: resourceFile
    });
    return response.data;
};

export default api;
