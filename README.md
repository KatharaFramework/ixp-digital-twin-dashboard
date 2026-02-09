# IXP Digital Twin Dashboard

A web-based dashboard for monitoring and managing IXP Digital Twin emulations. This tool provides customers and operators with a user-friendly interface to configure quarantine checks and validate configurations before deploying to production networks.

## Overview

This dashboard is part of the [ixp-digital-twin](https://github.com/KatharaFramework/ixp-digital-twin) ecosystem. The IXP Digital Twin is a tool that generates emulation-based digital twins of Internet Exchange Points from production network configurations, using Kathará to create a network scenario where route-servers expose the same information as real-world ones.

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

## Getting Started

To run the dashboard:
```
docker compose -f docker-compose-dev.yml up --build
```

Note: Use the `--build` flag only on the first run.
