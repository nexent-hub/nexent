from fastapi import APIRouter
import logging
from pydantic import BaseModel
import httpx
from backend.utils.config_utils import config_manager
import re
from urllib.parse import urlparse

router = APIRouter(prefix="/mcp")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp config")

class McpUrlVerifyRequest(BaseModel):
    mcp_url: str

def validate_url(url):
    """
    Validate URL format and check for invalid characters
    Returns: (bool, str) - (is_valid, error_message)
    """
    if not isinstance(url, str):
        return False, "URL必须是字符串类型"
    
    # 检查URL是否为空
    if not url.strip():
        return False, "URL不能为空"
        
    try:
        # 检查URL是否可以被正确解析
        parsed = urlparse(url)
        if not all([parsed.scheme, parsed.netloc]):
            return False, "无效的URL格式"
            
        # 检查URL是否包含非ASCII字符
        if not all(ord(char) < 128 for char in url):
            return False, "URL包含非ASCII字符"
            
        # 检查URL是否包含合法字符
        if not re.match(r'^[a-zA-Z0-9\-._~:/?#\[\]@!$&\'()*+,;=]+$', url):
            return False, "URL包含非法字符"
            
        return True, ""
        
    except Exception as e:
        return False, f"URL验证失败: {str(e)}"

async def receive_first_sse_event(client, url, timeout=5):
    """
    Receive the first SSE event and consider the connection successful if received within timeout
    """
    # 首先验证URL
    is_valid, error_message = validate_url(url)
    if not is_valid:
        logger.error(f"Invalid URL: {error_message}")
        return False, 400
        
    try:
        async with client.stream('GET', url, timeout=timeout) as response:
            if response.status_code != 200:
                return False, response.status_code
                
            async for line in response.aiter_lines():
                if line.strip():  # Consider connection successful if any non-empty data is received
                    return True, 200
    except Exception as e:
        logger.error(f"SSE connection error: {str(e)}")
        return False, 0

@router.post("/verify")
async def verify_mcp_url(request: McpUrlVerifyRequest):
    """
    Verify if the MCP URL is accessible through SSE connection
    """
    try:
        # Remove trailing slash from URL
        url = request.mcp_url.rstrip('/')
        
        # Try to connect to MCP service
        async with httpx.AsyncClient() as client:
            success, status_code = await receive_first_sse_event(client, url)
            
            if success:
                # Update configuration using config manager
                config_manager.set_config("MCP_SERVICE", url)
                return {"success": True, "message": "MCP服务连接成功"}
            elif status_code != 0:
                logging.error(f"MCP service returned error status code: {status_code}")
                return {"success": False, "message": f"MCP服务返回异常状态码: {status_code}"}
            else:
                return {"success": False, "message": "MCP服务连接失败"}
            
    except httpx.TimeoutException:
        return {"success": False, "message": "MCP服务连接超时"}
    except httpx.ConnectError:
        return {"success": False, "message": "无法连接到MCP服务"}
    except Exception as e:
        logging.error(f"Failed to verify MCP URL: {str(e)}")
        return {"success": False, "message": f"验证MCP URL失败: {str(e)}"}

@router.get("/list")
async def list_mcp_service():
    """
    Get the MCP service URL from configuration
    """
    try:
        mcp_list = []
        mcp_service = config_manager.get_config("MCP_SERVICE")
        mcp_list.append(mcp_service)

        return {"success": True, "mcp_list": mcp_list}
    except Exception as e:
        logging.error(f"Failed to get MCP service URL: {str(e)}")
        return {"success": False, "message": f"获取MCP服务地址失败: {str(e)}"}
