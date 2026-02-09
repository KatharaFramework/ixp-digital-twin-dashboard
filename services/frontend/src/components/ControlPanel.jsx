import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { FaPlay, FaStop, FaRedo, FaInfoCircle } from 'react-icons/fa';

const ControlPanel = ({ running, starting, onStart, onStop, onReload, loading, stopping }) => {
    const [maxDevices, setMaxDevices] = useState('');
    const [rsOnly, setRsOnly] = useState(false);

    const handleStart = () => {
        const devices = maxDevices ? parseInt(maxDevices) : null;
        onStart(devices);
    };

    return (
        <Card className="mb-3">
            <Card.Header className="fw-bold">Control Panel</Card.Header>
            <Card.Body>
                <Form>
                    <Row>
                        {/* Deployment Control Section */}
                        <Col>
                            <h6 className="text-muted mb-2">Deployment Control</h6>
                            <div className="d-flex gap-2 align-items-stretch">
                                <Button
                                    variant="success"
                                    onClick={handleStart}
                                    disabled={running || starting || loading || stopping}
                                    className="flex-fill d-flex align-items-center justify-content-center"
                                >
                                    {loading && !stopping ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                className="me-2"
                                            />
                                            Starting...
                                        </>
                                    ) : (
                                        <>
                                            <FaPlay className="me-2" />
                                            Start
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="danger"
                                    onClick={onStop}
                                    disabled={(!running && !starting) || stopping}
                                    className="flex-fill d-flex align-items-center justify-content-center"
                                >
                                    {stopping ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                className="me-2"
                                            />
                                            Stopping...
                                        </>
                                    ) : (
                                        <>
                                            <FaStop className="me-2" />
                                            Stop
                                        </>
                                    )}
                                </Button>

                                {/* TODO: Uncomment for development - Max devices selector */}
                                {/* <Form.Group className="mb-0">
                                    <Form.Control
                                        type="number"
                                        placeholder="Max Devices"
                                        value={maxDevices}
                                        onChange={(e) => setMaxDevices(e.target.value)}
                                        disabled={running || starting || loading}
                                        min="1"
                                        title="Limit the number of devices to start for faster deployment"
                                    />
                                </Form.Group> */}
                            </div>
                        </Col>

                        {/* Reload Configuration Section */}
                        <Col className="border-start ps-3">
                            <h6 className="text-muted mb-2">Reload Configuration</h6>
                            <Row className="g-2">
                                <Col>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            const devices = maxDevices ? parseInt(maxDevices) : null;
                                            onReload && onReload(rsOnly, devices);
                                        }}
                                        disabled={loading}
                                        className="w-100 d-flex align-items-center justify-content-center"
                                        style={{ height: '38px' }}
                                    >
                                        <FaRedo className="me-2" />
                                        Reload
                                    </Button>
                                </Col>
                                <Col className="d-flex align-items-center gap-2">
                                    <Form.Check
                                        type="switch"
                                        id="rsOnlyCheck"
                                        label="RS Only"
                                        checked={rsOnly}
                                        onChange={(e) => setRsOnly(e.target.checked)}
                                        disabled={loading}
                                        className="mb-0"
                                        title="Reload only the Route Server configuration without starting/stopping devices"
                                    />
                                    <FaInfoCircle
                                        style={{ fontSize: '0.85rem', color: '#6c757d', cursor: 'help' }}
                                        title="Reload only the Route Server configuration without starting/stopping devices"
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default ControlPanel;
