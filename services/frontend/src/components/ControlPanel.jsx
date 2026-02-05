import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { FaPlay, FaStop, FaRedo } from 'react-icons/fa';

const ControlPanel = ({ running, starting, onStart, onStop, onReload, loading }) => {
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
                    <Row className="align-items-end">
                        <Col md={8} className="mb-2 mb-md-0">
                            <Form.Group className="mb-2">
                                <Form.Label>Max Devices (optional)</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Leave empty for all devices"
                                    value={maxDevices}
                                    onChange={(e) => setMaxDevices(e.target.value)}
                                    disabled={running || starting || loading}
                                    min="1"
                                />
                                <Form.Text className="text-muted">
                                    Limit the number of devices to start for faster deployment
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <div className="d-grid gap-2">
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="success"
                                        onClick={handleStart}
                                        disabled={running || starting || loading}
                                        className="flex-fill"
                                    >
                                        {loading ? (
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
                                        disabled={(!running && !starting) || loading}
                                        className="flex-fill"
                                    >
                                        <FaStop className="me-2" />
                                        Stop
                                    </Button>
                                </div>

                                <div className="d-flex gap-2 align-items-center">
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            const devices = maxDevices ? parseInt(maxDevices) : null;
                                            onReload && onReload(rsOnly, devices);
                                        }}
                                        disabled={loading}
                                        className="flex-fill"
                                    >
                                        <FaRedo className="me-2" />
                                        Reload
                                    </Button>

                                    <Form.Check
                                        type="switch"
                                        id="rsOnlyCheck"
                                        label="RS Only"
                                        checked={rsOnly}
                                        onChange={(e) => setRsOnly(e.target.checked)}
                                        disabled={loading}
                                        className="mb-0 align-self-center"
                                    />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default ControlPanel;
