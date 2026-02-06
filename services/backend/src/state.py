"""Global state management for the digital twin."""

from typing import Optional, Any


class DigitalTwinState:
    """Manages the state of the digital twin application."""
    
    def __init__(self):
        """Initialize the digital twin state."""
        self._state = {
            "running": False,
            "starting": False,
            "net_scenario_manager": None,
            "table_dump": None,
            "error": None
        }
    
    def is_running(self) -> bool:
        """Check if the digital twin is running."""
        return self._state["running"]
    
    def is_starting(self) -> bool:
        """Check if the digital twin is starting."""
        return self._state["starting"]
    
    def get_error(self) -> Optional[str]:
        """Get the current error, if any."""
        return self._state["error"]
    
    def get_devices_count(self) -> Optional[int]:
        """Get the number of devices in the digital twin."""
        if self._state["table_dump"] is not None:
            return len(self._state["table_dump"].entries)
        return None
    
    def get_net_scenario_manager(self) -> Any:
        """Get the network scenario manager."""
        return self._state["net_scenario_manager"]
    
    def get_table_dump(self) -> Any:
        """Get the table dump."""
        return self._state["table_dump"]
    
    def set_starting(self, value: bool) -> None:
        """Set the starting state."""
        self._state["starting"] = value
    
    def set_running(self, value: bool) -> None:
        """Set the running state."""
        self._state["running"] = value
    
    def set_error(self, value: Optional[str]) -> None:
        """Set the error message."""
        self._state["error"] = value
    
    def set_net_scenario_manager(self, manager: Any) -> None:
        """Set the network scenario manager."""
        self._state["net_scenario_manager"] = manager
    
    def set_table_dump(self, dump: Any) -> None:
        """Set the table dump."""
        self._state["table_dump"] = dump
    
    def reset(self) -> None:
        """Reset all state to initial values."""
        self._state["running"] = False
        self._state["starting"] = False
        self._state["net_scenario_manager"] = None
        self._state["table_dump"] = None
        self._state["error"] = None


# Global state instance
digital_twin_state = DigitalTwinState()
