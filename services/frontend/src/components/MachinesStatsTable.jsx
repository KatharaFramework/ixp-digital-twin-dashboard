import React, { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Button, Modal, Form } from 'react-bootstrap';
import { FaTerminal } from 'react-icons/fa';
import { getMachinesStats, executeMachineCommand } from '../services/api';

export default function MachinesStatsTable({ running }) {
    const [machines, setMachines] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showExecModal, setShowExecModal] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [command, setCommand] = useState('');
    const [execLoading, setExecLoading] = useState(false);
    const [execOutput, setExecOutput] = useState(null);
    const [execError, setExecError] = useState(null);

    const fetchMachinesStats = async () => {
        if (!running) return;

        setLoading(true);
        setError(null);
        try {
            const data = await getMachinesStats();
            setMachines(data.machines || {});
        } catch (err) {
            console.error('Error fetching machines stats:', err);
            setError(err.response?.data?.detail || 'Failed to fetch machines statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachinesStats();
        const interval = setInterval(fetchMachinesStats, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [running]);

    const handleOpenExecModal = (machineName) => {
        setSelectedMachine(machineName);
        setCommand('');
        setExecOutput(null);
        setExecError(null);
        setShowExecModal(true);
    };

    const handleCloseExecModal = () => {
        setShowExecModal(false);
        setSelectedMachine(null);
        setCommand('');
        setExecOutput(null);
        setExecError(null);
    };

    const handleExecuteCommand = async () => {
        if (!command.trim() || !selectedMachine) return;

        setExecLoading(true);
        setExecError(null);
        setExecOutput(null);

        try {
            const response = await executeMachineCommand(selectedMachine, command);
            if (response.status === 'success') {
                setExecOutput(response.output);
            } else {
                setExecError(response.error || 'Command execution failed');
            }
        } catch (err) {
            console.error('Error executing command:', err);
            setExecError(err.response?.data?.detail || 'Failed to execute command');
        } finally {
            setExecLoading(false);
        }
    };

    if (!running) {
        return (
            <Alert variant="info" className="mt-4">
                Start the digital twin to view machines statistics.
            </Alert>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="mt-4">
                {error}
            </Alert>
        );
    }

    const machinesList = Object.entries(machines).sort((a, b) => {
        const nameA = (a[1].name || a[0]).toLowerCase();
        const nameB = (b[1].name || b[0]).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    if (loading && machinesList.length === 0) {
        return (
            <div className="mt-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (machinesList.length === 0) {
        return (
            <Alert variant="warning" className="mt-4">
                No machines data available yet.
            </Alert>
        );
    }

    return (
        <div className="mt-4">
            <h5>Machines Statistics</h5>
            <div className="table-responsive">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Machine Name</th>
                            <th>Status</th>
                            <th>Image</th>
                            <th>CPU Usage (%)</th>
                            <th>Memory Usage (MB)</th>
                            <th>PIDs</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machinesList.map(([machineId, stats]) => (
                            <tr key={machineId}>
                                <td className="font-monospace">{stats.name || machineId}</td>
                                <td>
                                    <span
                                        className={`badge bg-${
                                            stats.status === 'running' ? 'success' : 'danger'
                                        }`}
                                    >
                                        {stats.status}
                                    </span>
                                </td>
                                <td className="font-monospace">{stats.image}</td>
                                <td>{parseFloat(stats.cpu_usage).toFixed(2)}</td>
                                <td>{parseFloat(stats.memory_usage).toFixed(2)}</td>
                                <td>{stats.pids}</td>
                                <td>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleOpenExecModal(stats.name || machineId)}
                                        title="Execute command on this machine"
                                    >
                                        <FaTerminal className="me-1" />
                                        Exec
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            {loading && (
                <div className="text-center mt-2">
                    <small className="text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                    </small>
                </div>
            )}

            {/* Command Execution Modal */}
            <Modal show={showExecModal} onHide={handleCloseExecModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Execute Command on {selectedMachine}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Command</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter command to execute"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                disabled={execLoading}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !execLoading) {
                                        handleExecuteCommand();
                                    }
                                }}
                            />
                        </Form.Group>
                    </Form>

                    {execError && (
                        <Alert variant="danger" className="mb-3">
                            {execError}
                        </Alert>
                    )}

                    {execOutput && (
                        <div className="mb-3">
                            <Form.Label>Output</Form.Label>
                            <div
                                className="bg-dark text-light p-3 rounded font-monospace"
                                style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word'
                                }}
                            >
                                {execOutput}
                            </div>
                        </div>
                    )}

                    {execLoading && (
                        <div className="text-center">
                            <Spinner animation="border" role="status" className="me-2" />
                            Executing...
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseExecModal} disabled={execLoading}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleExecuteCommand}
                        disabled={!command.trim() || execLoading}
                    >
                        {execLoading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <FaTerminal className="me-2" />
                                Execute
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
