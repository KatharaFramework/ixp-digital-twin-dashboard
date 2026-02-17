# IXP Digital Twin Dashboard

A web-based dashboard for monitoring and managing IXP Digital Twin emulations. This tool provides customers and operators with a user-friendly interface to configure quarantine checks and validate configurations before deploying to production networks.

## Overview

This dashboard is part of the [ixp-digital-twin](https://github.com/KatharaFramework/ixp-digital-twin) ecosystem. The IXP Digital Twin is a tool that generates emulation-based digital twins of Internet Exchange Points from production network configurations, using Kathará to create a network scenario where route-servers expose the same information as real-world ones.

## Tutorial
A comprehensive tutorial is available in the [wiki](https://github.com/KatharaFramework/ixp-digital-twin/wiki), explaining how to configure the [digital twin](https://github.com/KatharaFramework/ixp-digital-twin), its [management dashboard](https://github.com/KatharaFramework/ixp-digital-twin-dashboard), and the [quarantine dashboard](https://github.com/KatharaFramework/ixp-quarantine-dashboard).

## About IXP Digital Twin

The [ixp-digital-twin](https://github.com/KatharaFramework/ixp-digital-twin) tool analyzes production configuration files and generates a Kathará network scenario with:
- Route servers based on production software versions (BIRD, OpenBGPD)
- Peer emulation using FRRouting routers injecting real routes with correct origin AS and AS-path
- Support for real device attachment via Kathará external feature

### Use Cases

- **Test Environment**: Validate configurations before applying in production
- **Staff Training**: Risk-free environment for network operations training
- **Customer Onboarding**: Safe configuration validation before production connection

## Quarantine Checks

The dashboard allows you to enable specific quarantine checks for your deployment. For dedicated quarantine check execution, see the [IXP Quarantine Dashboard](https://github.com/KatharaFramework/ixp-quarantine-dashboard).

## Prerequisites

To deploy and use the IXP Digital Twin Dashboard, ensure you have the following:

- **Docker**: For containerized deployment
- **IXP Digital Twin**: The [ixp-digital-twin](https://github.com/KatharaFramework/ixp-digital-twin) repository installed and configured

## Installation 

### Initialize the Digital Twin

Clone the [IXP Digital Twin](https://github.com/KatharaFramework/ixp-digital-twin) repository to initialize your environment.

Assuming a root folder called `digital-twin`, run:
```bash
git clone git@github.com:KatharaFramework/ixp-digital-twin.git
```

### Install the Dashboard

In the `digital-twin` direcory, clone the dashboard repository:
```bash
git clone git@github.com:KatharaFramework/ixp-digital-twin-dashboard.git
```

### Run

To run the dashboard:
```
docker compose -f docker-compose-dev.yml up --build
```

Note: Use the `--build` flag only on the first run.

## Acknowledgments
We would like to thank Emanuele Gigli (@supLeleh) and Gabriele Bianchi (@gabrielebnc), as this project is based on their prototypes.
