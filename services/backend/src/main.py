import logging
import os
from typing import Optional
import json

from Kathara.setting.Setting import Setting
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from digital_twin.ixp.colored_logging import set_logging
from digital_twin.ixp.configuration.frr_scenario_configuration_applier import FrrScenarioConfigurationApplier
from digital_twin.ixp.foundation.dumps.member_dump.member_dump_factory import MemberDumpFactory
from digital_twin.ixp.foundation.dumps.table_dump.table_dump_factory import TableDumpFactory
from digital_twin.ixp.globals import RESOURCES_FOLDER
from digital_twin.ixp.network_scenario.network_scenario_manager import NetworkScenarioManager
from digital_twin.ixp.network_scenario.rpki_manager import RPKIManager
from digital_twin.ixp.network_scenario.rs_manager import RouteServerManager
from digital_twin.ixp.settings.settings import Settings

ixp_config_path = os.path.join("digital_twin", "ixp.conf")
ixp_resource_path = os.path.join("digital_twin", "resources")

# Initialize FastAPI app
app = FastAPI(
    title="IXP Digital Twin API",
    description="API for managing IXP Digital Twin network scenarios and quarantine checks",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
digital_twin_state = {
    "running": False,
    "starting": False,
    "net_scenario_manager": None,
    "table_dump": None,
    "error": None
}


# Request/Response Models
class StartDigitalTwinRequest(BaseModel):
    max_devices: Optional[int] = Field(None, description="Limit the number of devices to start")


class StartDigitalTwinResponse(BaseModel):
    status: str
    message: str
    devices_count: Optional[int] = None


class DigitalTwinStatusResponse(BaseModel):
    running: bool
    starting: bool
    devices_count: Optional[int] = None
    error: Optional[str] = None


class QuarantineCheckRequest(BaseModel):
    asn: int = Field(..., description="Autonomous System Number")
    mac: str = Field(..., description="MAC address of the peer device")
    ipv4: Optional[str] = Field(None, description="IPv4 address of the peer device")
    ipv6: Optional[str] = Field(None, description="IPv6 address of the peer device")
    exclude_checks: Optional[str] = Field(None, description="Comma-separated list of checks to exclude")


class QuarantineCheckResponse(BaseModel):
    status: str
    results: dict


class ReloadDigitalTwinRequest(BaseModel):
    rs_only: bool = Field(False, description="Reload only RS configurations, skipping peerings")
    max_devices: Optional[int] = Field(None, description="Limit the number of devices to reload")


class ReloadDigitalTwinResponse(BaseModel):
    status: str
    message: str


# Helper Functions
async def start_digital_twin_async(max_devices: Optional[int] = None):
    """Initialize and start the digital twin in background"""
    try:
        digital_twin_state["starting"] = True
        digital_twin_state["error"] = None

        logger.info("Starting digital twin initialization...")

        # Set logging for digital twin
        set_logging()

        # Load settings
        logger.info("Loading settings...")
        settings = Settings.get_instance()
        settings.load_from_disk()

        # Configure Kathara
        Setting.get_instance().load_from_dict({"manager_type": "docker"})

        # Load member dump
        logger.info("Loading member dump...")
        member_dump_class = MemberDumpFactory(submodule_package="digital_twin").get_class_from_name(
            settings.peering_configuration["type"])
        entries = member_dump_class().load_from_file(
            os.path.join(RESOURCES_FOLDER, settings.peering_configuration["path"])
        )

        # Load table dump
        logger.info("Loading RIB dumps...")
        table_dump = TableDumpFactory(submodule_package="digital_twin").get_class_from_name(settings.rib_dumps["type"])(
            entries)

        for v, file in settings.rib_dumps["dumps"].items():
            table_dump.load_from_file(os.path.join(RESOURCES_FOLDER, file))

        # Limit devices if requested
        if max_devices is not None:
            logger.info(f"Limiting to {max_devices} devices...")
            table_dump.entries = dict(list(table_dump.entries.items())[0:max_devices])

        # Initialize managers
        logger.info("Initializing network scenario manager...")
        net_scenario_manager = NetworkScenarioManager()
        frr_conf = FrrScenarioConfigurationApplier(table_dump)
        rs_manager = RouteServerManager()
        rpki_manager = RPKIManager()

        # Build network scenario
        logger.info("Building network scenario...")
        net_scenario = net_scenario_manager.build(table_dump)

        # Apply configurations
        logger.info("Applying configurations...")
        frr_conf.apply_to_network_scenario(net_scenario)
        rs_manager.apply_to_network_scenario(net_scenario)
        rpki_manager.apply_to_network_scenario(net_scenario)

        # Interconnect devices
        logger.info("Interconnecting devices...")
        net_scenario_manager.interconnect(table_dump)

        # Undeploy any existing scenario
        logger.info("Cleaning up any existing deployment...")
        net_scenario_manager.undeploy()

        # Deploy the scenario
        logger.info("Deploying network scenario...")
        net_scenario_manager.deploy_chunks()

        # Update state
        digital_twin_state["running"] = True
        digital_twin_state["starting"] = False
        digital_twin_state["net_scenario_manager"] = net_scenario_manager
        digital_twin_state["table_dump"] = table_dump

        devices_count = len(table_dump.entries)
        logger.info(f"Digital twin started successfully with {devices_count} devices")

    except Exception as e:
        logger.error(f"Failed to start digital twin: {str(e)}", exc_info=True)
        digital_twin_state["starting"] = False
        digital_twin_state["running"] = False
        digital_twin_state["error"] = str(e)
        raise


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "IXP Digital Twin API is running"}


@app.get("/status", response_model=DigitalTwinStatusResponse)
async def get_status():
    """Get the current status of the digital twin"""
    devices_count = None
    if digital_twin_state["table_dump"] is not None:
        devices_count = len(digital_twin_state["table_dump"].entries)

    return DigitalTwinStatusResponse(
        running=digital_twin_state["running"],
        starting=digital_twin_state["starting"],
        devices_count=devices_count,
        error=digital_twin_state["error"]
    )


@app.post("/start", response_model=StartDigitalTwinResponse)
async def start_digital_twin(request: StartDigitalTwinRequest, background_tasks: BackgroundTasks):
    """Start the digital twin network scenario"""
    if digital_twin_state["running"]:
        raise HTTPException(status_code=400, detail="Digital twin is already running")

    if digital_twin_state["starting"]:
        raise HTTPException(status_code=400, detail="Digital twin is already starting")

    # Start in background
    background_tasks.add_task(start_digital_twin_async, request.max_devices)

    return StartDigitalTwinResponse(
        status="starting",
        message="Digital twin is starting in background. Check /status for progress.",
        devices_count=None
    )


@app.post("/stop")
async def stop_digital_twin():
    """Stop the digital twin network scenario"""
    if not digital_twin_state["running"] and not digital_twin_state["starting"]:
        raise HTTPException(status_code=400, detail="Digital twin is not running")

    try:
        logger.info("Stopping digital twin...")

        if digital_twin_state["net_scenario_manager"] is not None:
            digital_twin_state["net_scenario_manager"].undeploy()

        digital_twin_state["running"] = False
        digital_twin_state["starting"] = False
        digital_twin_state["net_scenario_manager"] = None
        digital_twin_state["table_dump"] = None
        digital_twin_state["error"] = None

        logger.info("Digital twin stopped successfully")
        return {"status": "success", "message": "Digital twin stopped successfully"}

    except Exception as e:
        logger.error(f"Failed to stop digital twin: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop digital twin: {str(e)}")


@app.post("/reload", response_model=ReloadDigitalTwinResponse)
async def reload_digital_twin(request: ReloadDigitalTwinRequest):
    """Reload the digital twin configurations without full restart"""
    if not digital_twin_state["running"]:
        raise HTTPException(status_code=400, detail="Digital twin is not running. Start it first.")

    try:
        logger.info("Reloading digital twin configurations...")

        if request.rs_only:
            logger.warning("Reloading RS configurations only! Peerings will not be updated!")

        # Set logging for digital twin
        set_logging()

        # Load settings
        settings = Settings.get_instance()
        settings.load_from_disk()

        # Configure Kathara
        Setting.get_instance().load_from_dict({"manager_type": "docker"})

        # Load member dump
        member_dump_class = MemberDumpFactory(submodule_package="digital_twin").get_class_from_name(
            settings.peering_configuration["type"]
        )
        entries = member_dump_class().load_from_file(
            os.path.join(RESOURCES_FOLDER, settings.peering_configuration["path"])
        )

        # Load table dump
        table_dump = TableDumpFactory(submodule_package="digital_twin").get_class_from_name(
            settings.rib_dumps["type"]
        )(entries)

        for v, file in settings.rib_dumps["dumps"].items():
            table_dump.load_from_file(os.path.join(RESOURCES_FOLDER, file))

        # Limit devices if requested
        if request.max_devices is not None:
            logger.info(f"Limiting to {request.max_devices} devices...")
            table_dump.entries = dict(list(table_dump.entries.items())[0:request.max_devices])

        # Get network scenario manager
        net_scenario_manager = digital_twin_state["net_scenario_manager"]
        if net_scenario_manager is None:
            raise HTTPException(status_code=500, detail="Network scenario manager not initialized")

        frr_conf = FrrScenarioConfigurationApplier(table_dump)

        if not request.rs_only:
            # Build diff and update devices
            logger.info("Building network scenario diff...")
            net_scenario = net_scenario_manager.build_diff(table_dump)
            new_devices = dict(x for x in net_scenario.machines.items() if "new" in x[1].meta and x[1].meta["new"])
            del_devices = dict(x for x in net_scenario.machines.items() if "del" in x[1].meta and x[1].meta["del"])

            logger.info(f"New devices: {len(new_devices)}, Deleted devices: {len(del_devices)}")

            frr_conf.apply_to_devices(new_devices)

            net_scenario_manager.deploy_devices(new_devices)
            net_scenario_manager.undeploy_devices(del_devices)
            net_scenario_manager.update_interconnection(table_dump, new_devices, set(del_devices.keys()))
        else:
            net_scenario = net_scenario_manager.get()

        # Update RS configurations
        logger.info("Updating Route Server configurations...")
        rs_manager = RouteServerManager()
        rs_info = rs_manager.get_device_info(net_scenario)
        return_code = net_scenario_manager.copy_and_exec_by_device_info(rs_info)
        if return_code != 0:
            raise HTTPException(status_code=500, detail="Failed to update Route Server configurations")

        # Update RPKI configurations
        logger.info("Updating RPKI configurations...")
        rpki_manager = RPKIManager()
        rpki_info = rpki_manager.get_device_info(net_scenario)
        return_code = net_scenario_manager.copy_and_exec_by_device_info(rpki_info)
        if return_code != 0:
            raise HTTPException(status_code=500, detail="Failed to update RPKI configurations")

        if not request.rs_only:
            # Update peerings configurations
            logger.info("Updating peerings configurations...")
            peerings_info = frr_conf.get_device_info(net_scenario)
            return_code = net_scenario_manager.copy_and_exec_by_device_info(peerings_info)
            if return_code != 0:
                raise HTTPException(status_code=500, detail="Failed to update peerings configurations")

        # Update the global state with new table_dump
        digital_twin_state["table_dump"] = table_dump

        logger.info("Configurations reload finished!")
        return ReloadDigitalTwinResponse(
            status="success",
            message="Digital twin configurations reloaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reload digital twin: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reload digital twin: {str(e)}")


@app.get("/config/ixp")
async def get_ixp_config():
    """Return the current ixp.conf as JSON."""
    try:
        if not os.path.exists(ixp_config_path):
            raise HTTPException(status_code=404, detail="ixp.conf not found")
        with open(ixp_config_path, 'r') as f:
            data = json.load(f)
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to read ixp.conf: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to read ixp.conf: {str(e)}")


@app.put("/config/ixp")
async def update_ixp_config(config: dict):
    """Overwrite ixp.conf with provided JSON body."""
    try:
        # Validate by serializing
        serialized = json.dumps(config, indent=4)
        with open(ixp_config_path, 'w') as f:
            f.write(serialized)
        return {"status": "success", "message": "ixp.conf updated"}
    except Exception as e:
        logger.error(f"Failed to write ixp.conf: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to write ixp.conf: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
