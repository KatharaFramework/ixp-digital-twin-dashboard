"""Digital twin operations - start, stop, reload logic."""

import logging
import os
from typing import Optional

from Kathara.setting.Setting import Setting
from digital_twin.ixp.colored_logging import set_logging
from digital_twin.ixp.configuration.frr_scenario_configuration_applier import FrrScenarioConfigurationApplier
from digital_twin.ixp.foundation.dumps.member_dump.member_dump_factory import MemberDumpFactory
from digital_twin.ixp.foundation.dumps.table_dump.table_dump_factory import TableDumpFactory
from digital_twin.ixp.globals import RESOURCES_FOLDER
from digital_twin.ixp.network_scenario.network_scenario_manager import NetworkScenarioManager
from digital_twin.ixp.network_scenario.rpki_manager import RPKIManager
from digital_twin.ixp.network_scenario.rs_manager import RouteServerManager
from digital_twin.ixp.settings.settings import Settings

from state import digital_twin_state

logger = logging.getLogger(__name__)


async def start_digital_twin_async(max_devices: Optional[int] = None):
    """Initialize and start the digital twin in background.
    
    Args:
        max_devices: Optional limit on the number of devices to start
        
    Raises:
        Exception: If initialization fails
    """
    try:
        digital_twin_state.set_starting(True)
        digital_twin_state.set_error(None)

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
        digital_twin_state.set_running(True)
        digital_twin_state.set_starting(False)
        digital_twin_state.set_net_scenario_manager(net_scenario_manager)
        digital_twin_state.set_table_dump(table_dump)

        devices_count = len(table_dump.entries)
        logger.info(f"Digital twin started successfully with {devices_count} devices")

    except Exception as e:
        logger.error(f"Failed to start digital twin: {str(e)}", exc_info=True)
        digital_twin_state.set_starting(False)
        digital_twin_state.set_running(False)
        digital_twin_state.set_error(str(e))
        raise


def stop_digital_twin():
    """Stop the digital twin network scenario.
    
    Returns:
        dict: Status message
        
    Raises:
        Exception: If stopping fails
    """
    try:
        logger.info("Stopping digital twin...")

        net_scenario_manager = digital_twin_state.get_net_scenario_manager()
        if net_scenario_manager is not None:
            net_scenario_manager.undeploy()

        digital_twin_state.reset()

        logger.info("Digital twin stopped successfully")
        return {"status": "success", "message": "Digital twin stopped successfully"}

    except Exception as e:
        logger.error(f"Failed to stop digital twin: {str(e)}", exc_info=True)
        raise


async def reload_digital_twin(rs_only: bool = False, max_devices: Optional[int] = None):
    """Reload the digital twin configurations without full restart.
    
    Args:
        rs_only: If True, reload only RS configurations, skipping peerings
        max_devices: Optional limit on the number of devices to reload
        
    Raises:
        Exception: If reload fails
    """
    try:
        logger.info("Reloading digital twin configurations...")

        if rs_only:
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
        if max_devices is not None:
            logger.info(f"Limiting to {max_devices} devices...")
            table_dump.entries = dict(list(table_dump.entries.items())[0:max_devices])

        # Get network scenario manager
        net_scenario_manager = digital_twin_state.get_net_scenario_manager()
        if net_scenario_manager is None:
            raise Exception("Network scenario manager not initialized")

        frr_conf = FrrScenarioConfigurationApplier(table_dump)

        if not rs_only:
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
            raise Exception("Failed to update Route Server configurations")

        # Update RPKI configurations
        logger.info("Updating RPKI configurations...")
        rpki_manager = RPKIManager()
        rpki_info = rpki_manager.get_device_info(net_scenario)
        return_code = net_scenario_manager.copy_and_exec_by_device_info(rpki_info)
        if return_code != 0:
            raise Exception("Failed to update RPKI configurations")

        if not rs_only:
            # Update peerings configurations
            logger.info("Updating peerings configurations...")
            peerings_info = frr_conf.get_device_info(net_scenario)
            return_code = net_scenario_manager.copy_and_exec_by_device_info(peerings_info)
            if return_code != 0:
                raise Exception("Failed to update peerings configurations")

        # Update the global state with new table_dump
        digital_twin_state.set_table_dump(table_dump)

        logger.info("Configurations reload finished!")
        return {"status": "success", "message": "Digital twin configurations reloaded successfully"}

    except Exception as e:
        logger.error(f"Failed to reload digital twin: {str(e)}", exc_info=True)
        raise
