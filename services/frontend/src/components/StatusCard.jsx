import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

const StatusCard = ({ running, starting, devicesCount, error, configMissing }) => {
    const navigate = useNavigate();

    if (configMissing) {
        return (
            <Card className="text-bg-warning mb-3">
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <FaExclamationTriangle size={24} className="me-2" />
                            <div>
                                <div className="fw-bold">Configuration Missing</div>
                                <div>The ixp.conf configuration file is not present.</div>
                            </div>
                        </div>
                        <Button 
                            variant="outline-dark" 
                            size="sm"
                            onClick={() => navigate('/config')}
                        >
                            Configure
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="text-bg-danger mb-3">
                <Card.Body>
                    <div className="d-flex align-items-center">
                        <FaTimesCircle size={24} className="me-2" />
                        <div>
                            <div className="fw-bold">Error</div>
                            <div>{error}</div>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (starting) {
        return (
            <Card className="text-bg-info mb-3">
                <Card.Body>
                    <div className="d-flex align-items-center">
                        <FaSpinner className="spinner-border spinner-border-sm me-2" />
                        <div>
                            <div className="fw-bold">Starting Digital Twin...</div>
                            <div>Please wait while the network scenario is being deployed.</div>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (running) {
        return (
            <Card className="text-bg-success mb-3">
                <Card.Body>
                    <div className="d-flex align-items-center">
                        <FaCheckCircle size={24} className="me-2" />
                        <div>
                            <div className="fw-bold">Digital Twin Running</div>
                            <div>
                                {devicesCount && `${devicesCount} customer${devicesCount !== 1 ? 's' : ''} deployed`}
                            </div>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="text-bg-secondary mb-3">
            <Card.Body>
                <div className="d-flex align-items-center">
                    <FaHourglassHalf size={24} className="me-2" />
                    <div>
                        <div className="fw-bold">Digital Twin Stopped</div>
                        <div>Start the digital twin to begin.</div>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default StatusCard;
