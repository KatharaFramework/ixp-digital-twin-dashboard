import React, { useState, useEffect } from 'react';
import { Table, Alert, Spinner } from 'react-bootstrap';
import { getMachinesStats } from '../services/api';

export default function MachinesStatsTable({ running }) {
    const [machines, setMachines] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
        </div>
    );
}
