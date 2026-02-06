import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { FaFlask, FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaDownload } from 'react-icons/fa';
import { compareRib, executeMachineCommand } from '../services/api';

const RibComparison = ({ running, resourceFiles, routeServers, minimized, onToggleMinimize }) => {
    const [selectedRouteServer, setSelectedRouteServer] = useState('');
    const [selectedResourceFile, setSelectedResourceFile] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloadingLiveRib, setDownloadingLiveRib] = useState(false);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    const handleDownloadLiveRib = async () => {
        if (!selectedRouteServer) {
            setErrorMessage('Please select a route server');
            return;
        }

        setDownloadingLiveRib(true);
        setErrorMessage(null);

        try {
            // Get the route server config to determine the type
            const rs = routeServers.find(rs => rs.name === selectedRouteServer);
            if (!rs) {
                throw new Error('Route server not found');
            }

            // Execute the appropriate command based on route server type
            const command = rs.type === 'bird' ? 'birdc show route all' : 'bgpctl show rib';
            const result = await executeMachineCommand(selectedRouteServer, command);

            if (result.status === 'success') {
                // Create a blob with the output
                const blob = new Blob([result.output], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${selectedRouteServer}-rib-${new Date().toISOString().split('T')[0]}.dump`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                setErrorMessage(result.error || 'Failed to download RIB');
            }
        } catch (error) {
            console.error('Error downloading live RIB:', error);
            setErrorMessage(error.message || 'Failed to download RIB');
        } finally {
            setDownloadingLiveRib(false);
        }
    };

    const handleCompare = async () => {
        if (!selectedRouteServer || !selectedResourceFile) {
            setErrorMessage('Please select both a route server and a resource file');
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        setComparisonResult(null);

        try {
            const result = await compareRib(selectedRouteServer, selectedResourceFile);
            setComparisonResult(result);
        } catch (error) {
            console.error('Error comparing RIB:', error);
            setErrorMessage(error.response?.data?.detail || 'Failed to compare RIB');
        } finally {
            setLoading(false);
        }
    };

    if (!running) {
        return (
            <Card className="mb-3 text-muted">
                <Card.Body>
                    <div className="d-flex align-items-center">
                        <FaFlask size={24} className="me-2" />
                        <div>
                            <div className="fw-bold">RIB Comparison</div>
                            <div>Start the digital twin to use this tool.</div>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="mb-3">
            <Card.Header className="bg-light d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                    <FaFlask size={20} className="me-2" />
                    <strong>RIB Comparison Tool</strong>
                </div>
                <Button
                    variant="link"
                    size="sm"
                    onClick={onToggleMinimize}
                    className="p-0 text-decoration-none text-dark"
                    title={minimized ? 'Expand' : 'Collapse'}
                >
                    {minimized ? <FaChevronUp size={18} /> : <FaChevronDown size={18} />}
                </Button>
            </Card.Header>
            {!minimized && (
                <Card.Body>
                    {errorMessage && (
                        <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)} className="mb-3">
                            {errorMessage}
                        </Alert>
                    )}

                    <Form className="mb-3">
                    <Form.Group className="mb-3">
                        <Form.Label>Route Server</Form.Label>
                        <Form.Select
                            value={selectedRouteServer}
                            onChange={(e) => setSelectedRouteServer(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a route server...</option>
                            {routeServers && routeServers.map((rs) => (
                                <option key={rs.name} value={rs.name}>
                                    {rs.name} ({rs.type})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Resource File</Form.Label>
                        <Form.Select
                            value={selectedResourceFile}
                            onChange={(e) => setSelectedResourceFile(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a dump file...</option>
                            {resourceFiles && resourceFiles.map((file) => (
                                <option key={file} value={file}>
                                    {file}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Button
                        variant="primary"
                        onClick={handleCompare}
                        disabled={loading || downloadingLiveRib || !selectedRouteServer || !selectedResourceFile}
                        className="me-2"
                    >
                        {loading && <Spinner animation="border" size="sm" className="me-2" />}
                        {loading ? 'Comparing...' : 'Compare RIB'}
                    </Button>

                    <Button
                        variant="outline-secondary"
                        onClick={handleDownloadLiveRib}
                        disabled={downloadingLiveRib || loading || !selectedRouteServer}
                    >
                        {downloadingLiveRib && <Spinner animation="border" size="sm" className="me-2" />}
                        <FaDownload className="me-1" />
                        {downloadingLiveRib ? 'Downloading...' : 'Download Live RIB'}
                    </Button>
                </Form>

                {comparisonResult && (
                    <div>
                        <div className="mb-3 p-3 bg-light rounded">
                            <div className="row">
                                <div className="col-md-4">
                                    <div className="text-center">
                                        <div className="text-muted small">Live RIB Routes</div>
                                        <div className="fs-4 fw-bold">{comparisonResult.live_rib_lines}</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-center">
                                        <div className="text-muted small">Uploaded RIB Routes</div>
                                        <div className="fs-4 fw-bold">{comparisonResult.uploaded_rib_lines}</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-center">
                                        <div className="text-muted small">Differences Found</div>
                                        <div className={`fs-4 fw-bold ${comparisonResult.differences_count > 0 ? 'text-warning' : 'text-success'}`}>
                                            {comparisonResult.differences_count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {comparisonResult.differences_count > 0 ? (
                            <Alert variant="warning" className="mb-3">
                                <div className="d-flex align-items-start">
                                    <FaExclamationTriangle className="me-2 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>RIB Differences Found</strong>
                                        <div className="small">{comparisonResult.message}</div>
                                    </div>
                                </div>
                            </Alert>
                        ) : (
                            <Alert variant="success" className="mb-3">
                                <div className="d-flex align-items-start">
                                    <FaCheckCircle className="me-2 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>RIB Match</strong>
                                        <div className="small">Live and uploaded RIB are identical</div>
                                    </div>
                                </div>
                            </Alert>
                        )}

                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setShowDetails(!showDetails)}
                            className="mb-3"
                        >
                            {showDetails ? 'Hide Details' : 'Show Details'}
                        </Button>

                        {showDetails && (
                            <div>
                                {comparisonResult.only_in_live && comparisonResult.only_in_live.length > 0 && (
                                    <div className="mb-3">
                                        <h6>Routes Only in Live RIB ({comparisonResult.only_in_live.length})</h6>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded p-2 bg-light">
                                            <Table striped bordered size="sm" className="mb-0">
                                                <tbody>
                                                    {comparisonResult.only_in_live.map((route, idx) => (
                                                        <tr key={idx}>
                                                            <td><small><code>{route}</code></small></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {comparisonResult.only_in_uploaded && comparisonResult.only_in_uploaded.length > 0 && (
                                    <div className="mb-3">
                                        <h6>Routes Only in Uploaded RIB ({comparisonResult.only_in_uploaded.length})</h6>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded p-2 bg-light">
                                            <Table striped bordered size="sm" className="mb-0">
                                                <tbody>
                                                    {comparisonResult.only_in_uploaded.map((route, idx) => (
                                                        <tr key={idx}>
                                                            <td><small><code>{route}</code></small></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Card.Body>
            )}
        </Card>
    );
};

export default RibComparison;
