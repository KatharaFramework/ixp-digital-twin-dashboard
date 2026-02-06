"""API routes for digital twin management."""

import logging
import os
import json
from fastapi import HTTPException, BackgroundTasks, UploadFile, File
from Kathara.manager.Kathara import Kathara

from schemas import (
    StartDigitalTwinRequest, StartDigitalTwinResponse,
    DigitalTwinStatusResponse, ReloadDigitalTwinRequest,
    ReloadDigitalTwinResponse, MachineStatsResponse,
    MachineExecRequest, MachineExecResponse
)
from state import digital_twin_state
from operations import start_digital_twin_async, stop_digital_twin, reload_digital_twin

logger = logging.getLogger(__name__)

ixp_config_path = os.path.join("digital_twin", "ixp.conf")
ixp_resource_path = os.path.join("digital_twin", "resources")


def register_routes(app):
    """Register all API routes to the FastAPI app.
    
    Args:
        app: FastAPI application instance
    """

    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {"status": "ok", "message": "IXP Digital Twin API is running"}

    @app.get("/status", response_model=DigitalTwinStatusResponse)
    async def get_status():
        """Get the current status of the digital twin."""
        return DigitalTwinStatusResponse(
            running=digital_twin_state.is_running(),
            starting=digital_twin_state.is_starting(),
            devices_count=digital_twin_state.get_devices_count(),
            error=digital_twin_state.get_error()
        )

    @app.post("/start", response_model=StartDigitalTwinResponse)
    async def start_digital_twin(request: StartDigitalTwinRequest, background_tasks: BackgroundTasks):
        """Start the digital twin network scenario."""
        if digital_twin_state.is_running():
            raise HTTPException(status_code=400, detail="Digital twin is already running")

        if digital_twin_state.is_starting():
            raise HTTPException(status_code=400, detail="Digital twin is already starting")

        # Start in background
        background_tasks.add_task(start_digital_twin_async, request.max_devices)

        return StartDigitalTwinResponse(
            status="starting",
            message="Digital twin is starting in background. Check /status for progress.",
            devices_count=None
        )

    @app.post("/stop")
    async def stop_digital_twin_endpoint():
        """Stop the digital twin network scenario."""
        if not digital_twin_state.is_running() and not digital_twin_state.is_starting():
            raise HTTPException(status_code=400, detail="Digital twin is not running")

        try:
            return stop_digital_twin()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to stop digital twin: {str(e)}")

    @app.get("/machines/stats", response_model=MachineStatsResponse)
    async def get_machines_stats():
        """Get statistics about running devices/machines."""
        if not digital_twin_state.is_running():
            raise HTTPException(status_code=400, detail="Digital twin is not running")

        try:
            logger.debug("Fetching machines statistics...")

            # Get Kathara manager instance
            manager = Kathara.get_instance()

            # Get network scenario from manager
            net_scenario_manager = digital_twin_state.get_net_scenario_manager()
            if net_scenario_manager is None:
                raise HTTPException(status_code=500, detail="Network scenario manager not initialized")

            lab = net_scenario_manager.get()

            machines_stats = {}
            for machine_id, stats in next(manager.get_machines_stats(lab=lab)).items():
                machines_stats[machine_id] = {
                    "status": stats.status,
                    "image": stats.image,
                    "cpu_usage": stats.cpu_usage,
                    "memory_usage": stats.mem_usage,
                    "pids": stats.pids,
                    "name": stats.name,
                }

            logger.debug(f"Retrieved statistics for {len(machines_stats)} machines")
            return MachineStatsResponse(
                status="success",
                machines=machines_stats
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get machines statistics: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to get machines statistics: {str(e)}")

    @app.post("/machines/exec", response_model=MachineExecResponse)
    async def execute_machine_command(request: MachineExecRequest):
        """Execute a command on a machine in the digital twin."""
        if not digital_twin_state.is_running():
            raise HTTPException(status_code=400, detail="Digital twin is not running")

        try:
            logger.info(f"Executing command on machine '{request.machine_name}': {request.command}")

            # Get Kathara manager instance
            manager = Kathara.get_instance()

            # Get network scenario from manager
            net_scenario_manager = digital_twin_state.get_net_scenario_manager()
            if net_scenario_manager is None:
                raise HTTPException(status_code=500, detail="Network scenario manager not initialized")

            lab = net_scenario_manager.get()

            # Execute command on the machine
            output = manager.exec(machine_name=request.machine_name, command=request.command, lab=lab, stream=False)
            output = output[0] if output[0] else output[1]
            output = output.decode('utf-8').strip()

            logger.info(f"Command executed successfully on machine '{request.machine_name}'")
            return MachineExecResponse(
                status="success",
                machine_name=request.machine_name,
                command=request.command,
                output=output
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to execute command on machine: {str(e)}", exc_info=True)
            return MachineExecResponse(
                status="error",
                machine_name=request.machine_name,
                command=request.command,
                error=str(e)
            )

    @app.post("/reload", response_model=ReloadDigitalTwinResponse)
    async def reload_digital_twin_endpoint(request: ReloadDigitalTwinRequest):
        """Reload the digital twin configurations without full restart."""
        if not digital_twin_state.is_running():
            raise HTTPException(status_code=400, detail="Digital twin is not running. Start it first.")

        try:
            result = await reload_digital_twin(request.rs_only, request.max_devices)
            return ReloadDigitalTwinResponse(
                status=result["status"],
                message=result["message"]
            )
        except Exception as e:
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

    @app.get("/resources/files")
    async def list_resource_files():
        """List all files in the resources directory."""
        try:
            if not os.path.exists(ixp_resource_path):
                return {"files": []}

            files = []
            for filename in os.listdir(ixp_resource_path):
                filepath = os.path.join(ixp_resource_path, filename)
                if os.path.isfile(filepath) and filename != '.gitkeep':
                    files.append(filename)

            return {"files": sorted(files)}
        except Exception as e:
            logger.error(f"Failed to list resource files: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to list resource files: {str(e)}")

    @app.post("/resources/upload")
    async def upload_resource_file(file: UploadFile = File(...)):
        """Upload a file to the resources directory."""
        try:
            # Create resources directory if it doesn't exist
            os.makedirs(ixp_resource_path, exist_ok=True)

            # Save file
            filepath = os.path.join(ixp_resource_path, file.filename)
            with open(filepath, 'wb') as f:
                content = await file.read()
                f.write(content)

            logger.info(f"File uploaded: {file.filename}")
            return {"status": "success", "filename": file.filename, "message": f"File {file.filename} uploaded successfully"}
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
