import React from 'react';
import { Navbar, Container } from 'react-bootstrap';

function DigitalTwinNavbar() {
    return (
        <Navbar className="bg-body-tertiary">
            <Container>
                <Navbar.Brand href="#home" className="align-items-center">
                    <span className="fw-bold fs-4">IXP Digital Twin Dashboard</span>
                </Navbar.Brand>
            </Container>
        </Navbar>
    );
}

export default DigitalTwinNavbar;
