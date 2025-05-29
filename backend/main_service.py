import uvicorn
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

from apps.base_app import app
from utils.logging_utils import configure_elasticsearch_logging

# Configure logging
configure_elasticsearch_logging()

logger = logging.getLogger("main service")


if __name__ == "__main__":
    # scan tools and update to database
    uvicorn.run(app, host="0.0.0.0", port=5010, access_log=False)
