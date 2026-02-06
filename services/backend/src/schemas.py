"""Pydantic models for API requests and responses."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class StartDigitalTwinRequest(BaseModel):
    """Request model for starting the digital twin."""
    max_devices: Optional[int] = Field(None, description="Limit the number of devices to start")


class StartDigitalTwinResponse(BaseModel):
    """Response model for starting the digital twin."""
    status: str
    message: str
    devices_count: Optional[int] = None


class DigitalTwinStatusResponse(BaseModel):
    """Response model for digital twin status."""
    running: bool
    starting: bool
    devices_count: Optional[int] = None
    error: Optional[str] = None


class QuarantineCheckRequest(BaseModel):
    """Request model for quarantine check."""
    asn: int = Field(..., description="Autonomous System Number")
    mac: str = Field(..., description="MAC address of the peer device")
    ipv4: Optional[str] = Field(None, description="IPv4 address of the peer device")
    ipv6: Optional[str] = Field(None, description="IPv6 address of the peer device")
    exclude_checks: Optional[str] = Field(None, description="Comma-separated list of checks to exclude")


class QuarantineCheckResponse(BaseModel):
    """Response model for quarantine check."""
    status: str
    results: dict


class ReloadDigitalTwinRequest(BaseModel):
    """Request model for reloading the digital twin."""
    rs_only: bool = Field(False, description="Reload only RS configurations, skipping peerings")
    max_devices: Optional[int] = Field(None, description="Limit the number of devices to reload")


class ReloadDigitalTwinResponse(BaseModel):
    """Response model for reloading the digital twin."""
    status: str
    message: str


class MachineStatsResponse(BaseModel):
    """Response model for machine statistics."""
    status: str
    machines: Dict[str, Any] = Field(default_factory=dict, description="Machine statistics keyed by device name")


class MachineExecRequest(BaseModel):
    """Request model for executing command on a machine."""
    machine_name: str = Field(..., description="Name of the machine to execute command on")
    command: str = Field(..., description="Command to execute on the machine")


class MachineExecResponse(BaseModel):
    """Response model for executing command on a machine."""
    status: str
    machine_name: str
    command: str
    output: Optional[str] = None
    error: Optional[str] = None

class RibComparisonRequest(BaseModel):
    """Request model for comparing RIB between route server and uploaded resource."""
    route_server: str = Field(..., description="Name of the route server")
    resource_file: str = Field(..., description="Name of the RIB dump file in resources")


class RibComparisonResponse(BaseModel):
    """Response model for RIB comparison."""
    status: str
    route_server: str
    resource_file: str
    live_rib_lines: int = Field(description="Number of routes in live RIB")
    uploaded_rib_lines: int = Field(description="Number of routes in uploaded RIB")
    only_in_live: List[str] = Field(default_factory=list, description="Routes only in live RIB")
    only_in_uploaded: List[str] = Field(default_factory=list, description="Routes only in uploaded RIB")
    differences_count: int = Field(description="Total number of differences")
    message: Optional[str] = None
    error: Optional[str] = None