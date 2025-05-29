import json
import os
import time

from dotenv import load_dotenv, set_key


def safe_value(value):
    """Helper function for processing configuration values"""
    if value is None:
        return ""
    return str(value)


def safe_list(value):
    """Helper function for processing list values, using JSON format for storage to facilitate parsing"""
    if not value:
        return "[]"
    return json.dumps(value)


def get_env_key(key: str) -> str:
    """Helper function for generating environment variable key names"""
    # Convert camelCase to snake_case format
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', key)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).upper()


class ConfigManager:
    """Configuration manager for dynamic loading and caching configurations"""

    def __init__(self, env_file=".env"):
        self.env_file = env_file
        self.last_modified_time = 0
        self.config_cache = {}
        self.load_config()

    def load_config(self):
        """Load configuration file and update cache"""
        # Check if file exists
        if not os.path.exists(self.env_file):
            print(f"Warning: Configuration file {self.env_file} does not exist")
            return

        # Get file last modification time
        current_mtime = os.path.getmtime(self.env_file)

        # If file hasn't been modified, return directly
        if current_mtime == self.last_modified_time:
            return

        # Update last modification time
        self.last_modified_time = current_mtime

        # Reload configuration
        load_dotenv(self.env_file, override=True)

        # Update cache
        self.config_cache = {key: value for key, value in os.environ.items()}

        print(f"Configuration reloaded at: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    def get_config(self, key, default=""):
        """Get configuration value, reload if configuration has been updated"""
        self.load_config()
        return self.config_cache.get(key, default)

    def set_config(self, key, value):
        """Set configuration value"""
        self.config_cache[key] = value
        set_key(self.env_file, key, value)

    def force_reload(self):
        """Force reload configuration"""
        self.last_modified_time = 0
        self.load_config()
        return {"status": "success", "message": "Configuration reloaded"}

# Create global configuration manager instance
config_manager = ConfigManager(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))