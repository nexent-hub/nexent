from fastapi import HTTPException, APIRouter
import logging
from database.agent_db import query_all_tools
from consts.model import ToolInstanceInfoRequest, ToolInstanceSearchRequest
from services.tool_configuration_service import tool_configuration_service


router = APIRouter(prefix="/tool")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tool config")


@router.get("/list")
async def list_tools_api():
    """
    List all system tools from PG dataset
    """
    try:
        return query_all_tools()
    except Exception as e:
        logging.error(f"Failed to get tool info, error in: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tool info, error in: {str(e)}")

@router.post("/search")
async def search_tool_info_api(request: ToolInstanceSearchRequest):
    try:
        return tool_configuration_service.search_tool_info_impl(request.agent_id, request.tool_id)
    except Exception as e: 
        logging.error(f"Failed to update tool, error in: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update tool, error in: {str(e)}")


@router.post("/update")
async def update_tool_info_api(request: ToolInstanceInfoRequest):
    """
    Update an existing tool, create or update tool instance
    """
    try:
        return tool_configuration_service.update_tool_info_impl(request)
    except Exception as e:
        logging.error(f"Failed to update tool, error in: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update tool, error in: {str(e)}")
