import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import StatusCard from '../components/StatusCard';
import ControlPanel from '../components/ControlPanel';
import MachinesStatsTable from '../components/MachinesStatsTable';
import RibComparison from '../components/RibComparison';
import { getStatus, startDigitalTwin, stopDigitalTwin, reloadDigitalTwin, getIxpConfig, listResourceFiles } from '../services/api';

export default function Dashboard() {
    const [status, setStatus] = useState({
        running: false,
        starting: false,
        devices_count: null,
        error: null
    });
    const [loading, setLoading] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState('info');
    const [resourceFiles, setResourceFiles] = useState([]);
    const [routeServers, setRouteServers] = useState([]);
    const [configMissing, setConfigMissing] = useState(false);
    const [minimizeRibComparison, setMinimizeRibComparison] = useState(false);
    const [labStatusLoading, setLabStatusLoading] = useState(false);
    const [resourceStatusLoading, setResourceStatusLoading] = useState(false);
    const [ixpConfigStatusLoading, setIxpConfigStatusLoading] = useState(false);


    const fetchStatus = async () => {
        if (labStatusLoading) return;

        setLabStatusLoading(true);
        try {
            const data = await getStatus();
            setStatus(data);
        } catch (error) {
            console.error('Error fetching status:', error);
            setStatus(prev => ({
                ...prev,
                error: error.response?.data?.detail || 'Failed to connect to backend'
            }));
        } finally {
            setLabStatusLoading(false);
        }
    };

    const fetchResourceFiles = async () => {
        if (resourceStatusLoading) return;

        setResourceStatusLoading(true);
        try {
            const data = await listResourceFiles();
            setResourceFiles(data.files || []);
        } catch (error) {
            console.error('Error fetching resource files:', error);
        } finally {
            setResourceStatusLoading(false);
        }
    };

    const fetchIxpConfig = async () => {
        if (ixpConfigStatusLoading) return;

        setIxpConfigStatusLoading(true);
        try {
            const config = await getIxpConfig();
            // Check if config is empty (file not present)
            if (Object.keys(config).length === 0) {
                setConfigMissing(true);
                setRouteServers([]);
            } else {
                if (config.route_servers) {
                    const servers = Object.entries(config.route_servers).map(([name, data]) => ({
                        name,
                        type: data.type || 'unknown'
                    }));
                    setRouteServers(servers);
                }
                setConfigMissing(false);
            }
        } catch (error) {
            console.error('Error fetching route servers:', error);
            setConfigMissing(true);
        } finally {
            setIxpConfigStatusLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchResourceFiles();
        fetchIxpConfig();
        const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const handleStart = async (maxDevices) => {
        setLoading(true);
        setAlertMessage(null);
        try {
            const response = await startDigitalTwin(maxDevices);
            await fetchStatus();
        } catch (error) {
            console.error('Error starting Digital Twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to start Digital Twin');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setStopping(true);
        setAlertMessage(null);
        try {
            const response = await stopDigitalTwin();
            await fetchStatus();
        } catch (error) {
            console.error('Error stopping Digital Twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to stop Digital Twin');
            setAlertType('danger');
        } finally {
            setStopping(false);
        }
    };

    const handleReload = async (rsOnly = false, maxDevices = null) => {
        setLoading(true);
        setAlertMessage(null);
        try {
            const response = await reloadDigitalTwin(rsOnly, maxDevices);
            await fetchStatus();
        } catch (error) {
            console.error('Error reloading Digital Twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to reload Digital Twin');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid>
            {alertMessage && (
                <Alert
                    variant={alertType}
                    dismissible
                    onClose={() => setAlertMessage(null)}
                    className="mb-3"
                >
                    {alertMessage}
                </Alert>
            )}

            <Row className="justify-content-center">
                <Col>
                    <StatusCard
                        running={status.running}
                        starting={status.starting}
                        devicesCount={status.devices_count}
                        error={status.error}
                        configMissing={configMissing}
                    />

                    <ControlPanel
                        running={status.running}
                        starting={status.starting}
                        onStart={handleStart}
                        onStop={handleStop}
                        onReload={handleReload}
                        loading={loading}
                        stopping={stopping}
                    />

                    <RibComparison 
                        running={status.running} 
                        resourceFiles={resourceFiles}
                        routeServers={routeServers}
                        minimized={minimizeRibComparison}
                        onToggleMinimize={() => setMinimizeRibComparison(!minimizeRibComparison)}
                    />
                    
                    <MachinesStatsTable running={status.running} />
                </Col>
            </Row>
        </Container>
    );
}