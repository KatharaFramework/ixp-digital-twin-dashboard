import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import StatusCard from '../components/StatusCard';
import ControlPanel from '../components/ControlPanel';
import { getStatus, startDigitalTwin, stopDigitalTwin, reloadDigitalTwin } from '../services/api';

export default function Dashboard() {
    const [status, setStatus] = useState({
        running: false,
        starting: false,
        devices_count: null,
        error: null
    });
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState('info');

    const fetchStatus = async () => {
        try {
            const data = await getStatus();
            setStatus(data);
        } catch (error) {
            console.error('Error fetching status:', error);
            setStatus(prev => ({
                ...prev,
                error: error.response?.data?.detail || 'Failed to connect to backend'
            }));
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const handleStart = async (maxDevices) => {
        setLoading(true);
        setAlertMessage(null);
        try {
            const response = await startDigitalTwin(maxDevices);
            setAlertMessage(response.message);
            setAlertType('info');
            // Status will be updated by polling
        } catch (error) {
            console.error('Error starting digital twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to start digital twin');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        setAlertMessage(null);
        try {
            const response = await stopDigitalTwin();
            setAlertMessage(response.message);
            setAlertType('success');
            await fetchStatus();
        } catch (error) {
            console.error('Error stopping digital twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to stop digital twin');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleReload = async (rsOnly = false, maxDevices = null) => {
        setLoading(true);
        setAlertMessage(null);
        try {
            const response = await reloadDigitalTwin(rsOnly, maxDevices);
            setAlertMessage(response.message || 'Reload triggered');
            setAlertType('info');
            await fetchStatus();
        } catch (error) {
            console.error('Error reloading digital twin:', error);
            setAlertMessage(error.response?.data?.detail || 'Failed to reload digital twin');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <h1 className="text-center my-4">IXP Digital Twin Management</h1>

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
                <Col lg={10} xl={8}>
                    <StatusCard
                        running={status.running}
                        starting={status.starting}
                        devicesCount={status.devices_count}
                        error={status.error}
                    />

                    <ControlPanel
                        running={status.running}
                        starting={status.starting}
                        onStart={handleStart}
                        onStop={handleStop}
                        onReload={handleReload}
                        loading={loading}
                    />

                    <div className="mt-4 p-3 bg-light rounded">
                        <h5>About</h5>
                        <p className="text-muted mb-0">
                            This dashboard allows you to manage the IXP Digital Twin network scenario.
                            Start the digital twin to deploy the network devices, or stop it to clean up resources.
                            You can optionally limit the number of devices for faster testing.
                        </p>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
