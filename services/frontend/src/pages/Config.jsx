import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Alert, Spinner, Row, Col, Card } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { getIxpConfig, updateIxpConfig } from '../services/api';

export default function Config() {
    const [originalConfig, setOriginalConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null);
    const [alertType, setAlertType] = useState('info');

    // Form fields
    const [scenarioName, setScenarioName] = useState('');
    const [hostInterface, setHostInterface] = useState('');
    const [peeringLan4, setPeeringLan4] = useState('');
    const [peeringLan6, setPeeringLan6] = useState('');
    const [peeringConfigPath, setPeeringConfigPath] = useState('');
    const [ribDumpsType, setRibDumpsType] = useState('');
    const [ribDumpFileV4, setRibDumpFileV4] = useState('');
    const [ribDumpFileV6, setRibDumpFileV6] = useState('');
    const [routeServers, setRouteServers] = useState([]);
    const [rpkiServers, setRpkiServers] = useState([]);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setAlertMsg(null);
        try {
            const data = await getIxpConfig();
            setOriginalConfig(data);

            setScenarioName(data.scenario_name || '');
            setHostInterface(data.host_interface || '');
            setPeeringLan4((data.peering_lan && data.peering_lan['4']) || '');
            setPeeringLan6((data.peering_lan && data.peering_lan['6']) || '');
            setPeeringConfigPath((data.peering_configuration && data.peering_configuration.path) || '');
            setRibDumpsType((data.rib_dumps && data.rib_dumps.type) || '');
            setRibDumpFileV4((data.rib_dumps && data.rib_dumps.dumps && data.rib_dumps.dumps['4']) || '');
            setRibDumpFileV6((data.rib_dumps && data.rib_dumps.dumps && data.rib_dumps.dumps['6']) || '');

            // Load route servers
            const rsArray = [];
            if (data.route_servers) {
                Object.entries(data.route_servers).forEach(([name, config]) => {
                    rsArray.push({
                        name,
                        type: config.type || '',
                        image: config.image || '',
                        as_num: config.as_num || '',
                        config: config.config || '',
                        address: config.address || ''
                    });
                });
            }
            setRouteServers(rsArray);

            // Load RPKI servers
            const rpkiArray = [];
            if (data.rpki && Array.isArray(data.rpki)) {
                data.rpki.forEach(rpki => {
                    rpkiArray.push({
                        type: rpki.type || '',
                        address: rpki.address || '',
                        port: rpki.port || '',
                        protocol: rpki.protocol || ''
                    });
                });
            }
            setRpkiServers(rpkiArray);
        } catch (err) {
            console.error('Failed to load ixp.conf', err);
            setAlertMsg(err.response?.data?.detail || 'Failed to load configuration');
            setAlertType('danger');
        } finally {
            setLoading(false);
        }
    };

    const addRouteServer = () => {
        setRouteServers([...routeServers, { name: '', type: '', image: '', as_num: '', config: '', address: '' }]);
    };

    const removeRouteServer = (index) => {
        setRouteServers(routeServers.filter((_, i) => i !== index));
    };

    const updateRouteServer = (index, field, value) => {
        const updated = [...routeServers];
        updated[index][field] = value;
        setRouteServers(updated);
    };

    const addRpkiServer = () => {
        setRpkiServers([...rpkiServers, { type: '', address: '', port: '', protocol: '' }]);
    };

    const removeRpkiServer = (index) => {
        setRpkiServers(rpkiServers.filter((_, i) => i !== index));
    };

    const updateRpkiServer = (index, field, value) => {
        const updated = [...rpkiServers];
        updated[index][field] = value;
        setRpkiServers(updated);
    };

    const handleSave = async () => {
        if (!originalConfig) return;
        setSaving(true);
        setAlertMsg(null);
        try {
            // Clone original and apply form fields
            const updated = JSON.parse(JSON.stringify(originalConfig));
            updated.scenario_name = scenarioName;
            updated.host_interface = hostInterface || null;
            updated.peering_lan = updated.peering_lan || {};
            updated.peering_lan['4'] = peeringLan4;
            updated.peering_lan['6'] = peeringLan6;
            updated.peering_configuration = updated.peering_configuration || {};
            updated.peering_configuration.path = peeringConfigPath;
            updated.rib_dumps = updated.rib_dumps || { dumps: {} };
            updated.rib_dumps.type = ribDumpsType;
            updated.rib_dumps.dumps = updated.rib_dumps.dumps || {};
            updated.rib_dumps.dumps['4'] = ribDumpFileV4;
            updated.rib_dumps.dumps['6'] = ribDumpFileV6;

            // Rebuild route_servers from array
            updated.route_servers = {};
            routeServers.forEach(rs => {
                if (rs.name && rs.name.trim()) {
                    updated.route_servers[rs.name] = {
                        type: rs.type,
                        image: rs.image,
                        as_num: rs.as_num ? parseInt(rs.as_num) : rs.as_num,
                        config: rs.config,
                        address: rs.address
                    };
                }
            });

            // Rebuild RPKI servers from array
            updated.rpki = rpkiServers.map(rpki => ({
                type: rpki.type,
                address: rpki.address,
                port: rpki.port ? parseInt(rpki.port) : rpki.port,
                protocol: rpki.protocol
            }));

            const resp = await updateIxpConfig(updated);
            setAlertMsg(resp.message || 'Configuration updated');
            setAlertType('success');
            // reload original config from disk to reflect exact stored file
            await loadConfig();
        } catch (err) {
            console.error('Failed to save ixp.conf', err);
            setAlertMsg(err.response?.data?.detail || err.message || 'Failed to save configuration');
            setAlertType('danger');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <h1 className="mb-4">ixp.conf — Configuration</h1>

            {alertMsg && (
                <Alert variant={alertType} dismissible onClose={() => setAlertMsg(null)}>
                    {alertMsg}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                </div>
            ) : (
                <Form>
                    {/* Basic Settings Section */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">Basic Settings</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Scenario Name</Form.Label>
                                        <Form.Control value={scenarioName} onChange={e => setScenarioName(e.target.value)} />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Host Interface</Form.Label>
                                        <Form.Control value={hostInterface || ''} onChange={e => setHostInterface(e.target.value)} />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Peering LAN IPv4</Form.Label>
                                        <Form.Control value={peeringLan4} onChange={e => setPeeringLan4(e.target.value)} />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Peering LAN IPv6</Form.Label>
                                        <Form.Control value={peeringLan6} onChange={e => setPeeringLan6(e.target.value)} />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Peering Configuration Section */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-info text-white">
                            <h5 className="mb-0">Peering Configuration</h5>
                        </Card.Header>
                        <Card.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Peering configuration path</Form.Label>
                                <Form.Control value={peeringConfigPath} onChange={e => setPeeringConfigPath(e.target.value)} />
                            </Form.Group>
                        </Card.Body>
                    </Card>

                    {/* RIB Dumps Section */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">RIB Dumps</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>RIB dumps Type</Form.Label>
                                        <Form.Control
                                            as="select"
                                            value={ribDumpsType}
                                            onChange={e => setRibDumpsType(e.target.value)}
                                        >
                                            <option value="">-- Select Type --</option>
                                            <option value="bird">bird</option>
                                            <option value="open_bgpd">open_bgpd</option>
                                        </Form.Control>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>RIB dump file (IPv4)</Form.Label>
                                        <Form.Control value={ribDumpFileV4} onChange={e => setRibDumpFileV4(e.target.value)} />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>RIB dump file (IPv6)</Form.Label>
                                        <Form.Control value={ribDumpFileV6} onChange={e => setRibDumpFileV6(e.target.value)} />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Route Servers Section */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">Route Servers</h5>
                        </Card.Header>
                        <Card.Body>
                        {routeServers.length === 0 ? (
                            <p className="text-muted">No route servers configured</p>
                        ) : (
                            routeServers.map((rs, idx) => (
                                <Card key={idx} className="mb-3">
                                    <Card.Header className="d-flex justify-content-between align-items-center">
                                        <span>Route Server: {rs.name || `(unnamed)`}</span>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => removeRouteServer(idx)}
                                        >
                                            <FaTrash className="me-2" />
                                            Remove
                                        </Button>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Device Name</Form.Label>
                                                    <Form.Control
                                                        value={rs.name}
                                                        onChange={e => updateRouteServer(idx, 'name', e.target.value)}
                                                        placeholder="e.g., rsv4"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>Type</Form.Label>
                                                    <Form.Control
                                                        as="select"
                                                        value={rs.type}
                                                        onChange={e => updateRouteServer(idx, 'type', e.target.value)}
                                                    >
                                                        <option value="">-- Select Type --</option>
                                                        <option value="bird">bird</option>
                                                        <option value="open_bgpd">open_bgpd</option>
                                                    </Form.Control>
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>Docker Image</Form.Label>
                                                    <Form.Control
                                                        value={rs.image}
                                                        onChange={e => updateRouteServer(idx, 'image', e.target.value)}
                                                        placeholder="e.g., kathara/bird2-birdwatcher:2.0.8"
                                                    />
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>AS Number</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        value={rs.as_num}
                                                        onChange={e => updateRouteServer(idx, 'as_num', e.target.value)}
                                                        placeholder="e.g., 10"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>Config File/Path</Form.Label>
                                                    <Form.Control
                                                        value={rs.config}
                                                        onChange={e => updateRouteServer(idx, 'config', e.target.value)}
                                                        placeholder="e.g., bird.conf"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>IP Address</Form.Label>
                                                    <Form.Control
                                                        value={rs.address}
                                                        onChange={e => updateRouteServer(idx, 'address', e.target.value)}
                                                        placeholder="e.g., 192.168.127.10"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))
                        )}
                        <Button variant="success" onClick={addRouteServer} className="mt-2">
                            <FaPlus className="me-2" />
                            Add Route Server
                        </Button>
                        </Card.Body>
                    </Card>

                    {/* RPKI Servers Section */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-danger text-white">
                            <h5 className="mb-0">RPKI Servers</h5>
                        </Card.Header>
                        <Card.Body>
                        {rpkiServers.length === 0 ? (
                            <p className="text-muted">No RPKI servers configured</p>
                        ) : (
                            rpkiServers.map((rpki, idx) => (
                                <Card key={idx} className="mb-3">
                                    <Card.Header className="d-flex justify-content-between align-items-center">
                                        <span>RPKI Server: {rpki.address || `(unnamed)`}</span>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => removeRpkiServer(idx)}
                                        >
                                            <FaTrash className="me-2" />
                                            Remove
                                        </Button>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Type</Form.Label>
                                                    <Form.Control
                                                        as="select"
                                                        value={rpki.type}
                                                        onChange={e => updateRpkiServer(idx, 'type', e.target.value)}
                                                    >
                                                        <option value="">-- Select Type --</option>
                                                        <option value="external">external</option>
                                                        <option value="internal">internal</option>
                                                    </Form.Control>
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>Address</Form.Label>
                                                    <Form.Control
                                                        value={rpki.address}
                                                        onChange={e => updateRpkiServer(idx, 'address', e.target.value)}
                                                        placeholder="e.g., 192.168.1.1"
                                                    />
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Port</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        value={rpki.port}
                                                        onChange={e => updateRpkiServer(idx, 'port', e.target.value)}
                                                        placeholder="e.g., 3323"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label>Protocol</Form.Label>
                                                    <Form.Control
                                                        value={rpki.protocol}
                                                        onChange={e => updateRpkiServer(idx, 'protocol', e.target.value)}
                                                        placeholder="e.g., rtr"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))
                        )}
                        <Button variant="success" onClick={addRpkiServer} className="mt-2">
                            <FaPlus className="me-2" />
                            Add RPKI Server
                        </Button>
                        </Card.Body>
                    </Card>

                    {/* Action Buttons */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Body className="d-flex gap-2">
                        <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
                            {saving ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                        <Button variant="secondary" onClick={loadConfig} disabled={loading || saving}>
                            Reload from disk
                        </Button>
                        <Button variant="outline-secondary" onClick={() => {
                            // fallback: open raw editor in a new window/tab with pretty JSON
                            if (originalConfig) {
                                const w = window.open();
                                w.document.write(`<pre>${JSON.stringify(originalConfig, null, 4)}</pre>`);
                            }
                        }}>
                            View raw
                        </Button>
                        </Card.Body>
                    </Card>
                </Form>
            )}
        </Container>
    );
}
