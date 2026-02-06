import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { FaPlay, FaStop, FaRedo } from 'react-icons/fa';

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
                    <Row className="align-items-end">
                        <Col>
                            <div className="d-grid gap-2">
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="success"
                                        onClick={handleStart}
                                        disabled={running || starting || loading || stopping}
                                        className="flex-fill"
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

                                    <Form.Group className="mb-0 flex-grow-1">
                                        <Form.Control
                                            type="number"
                                            placeholder="Max Devices"
                                            value={maxDevices}
                                            onChange={(e) => setMaxDevices(e.target.value)}
                                            disabled={running || starting || loading}
                                            min="1"
                                            title="Limit the number of devices to start for faster deployment"
                                        />
                                    </Form.Group>
                                </div>

                                <div className="d-flex gap-2 align-items-center">
                                    <Button
                                        variant="danger"
                                        onClick={onStop}
                                        disabled={(!running && !starting) || stopping}
                                        className="flex-fill"
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
