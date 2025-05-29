import asyncio
import logging
import time
from threading import Thread

from fastapi import HTTPException, APIRouter, Header
from fastapi.responses import StreamingResponse

from consts.model import AgentRequest, AgentInfoRequest, AgentIDRequest
from nexent.core.utils.observer import MessageObserver
from services.agent_service import query_or_create_main_agents_api, \
    agent_run_thread, list_main_agent_info_impl, get_agent_info_impl, \
    get_creating_sub_agent_info_impl, update_agent_info_impl, delete_agent_impl
from services.conversation_management_service import save_conversation_user, save_conversation_assistant
from utils.agent_utils import thread_manager
from utils.config_utils import config_manager
from utils.thread_utils import submit
from utils.user_utils import get_user_info

router = APIRouter(prefix="/agent")
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent app")


# Define API route
@router.post("/run")
async def agent_run_api(request: AgentRequest, authorization: str = Header(None)):
    """
    Agent execution API endpoint
    """
    # Ensure configuration is up to date
    config_manager.load_config()
    # Save user message only if not in debug mode
    if not request.is_debug:
        submit(save_conversation_user, request, authorization)
    minio_files = request.minio_files
    final_query = request.query
    agent_id = request.agent_id
    user_id, tenant_id = get_user_info()
    if not agent_id:
        agent_id = query_or_create_main_agents_api(tenant_id=tenant_id, user_id=user_id)
        logger.info(f"Start chat! Agent ID: {agent_id}")

    if minio_files and isinstance(minio_files, list):
        file_descriptions = []
        for file in minio_files:
            if isinstance(file, dict) and "description" in file and file["description"]:
                file_descriptions.append(file["description"])

        if file_descriptions:
            final_query = "User provided some reference files:\n"
            final_query += "\n".join(file_descriptions) + "\n\n"
            final_query += f"User wants to answer questions based on the above information: {request.query}"

    observer = MessageObserver()
    try:
        # Generate unique thread ID
        thread_id = f"{time.time()}_{id(observer)}"

        thread_agent = Thread(
            target=agent_run_thread,
            args=(observer, final_query, agent_id, tenant_id, user_id, request.history)
        )
        thread_agent.start()

        # Add thread to manager
        thread_manager.add_thread(thread_id, thread_agent)

        async def generate():
            messages = []
            try:
                while thread_agent.is_alive():
                    cached_message = observer.get_cached_message()
                    for message in cached_message:
                        yield f"data: {message}\n\n"
                        messages.append(message)

                        # Prevent artificial slowdown of model streaming output
                        if len(cached_message) < 8:
                            # Ensure streaming output has some time interval
                            await asyncio.sleep(0.05)
                    await asyncio.sleep(0.1)

                # Ensure all messages are sent
                cached_message = observer.get_cached_message()
                for message in cached_message:
                    yield f"data: {message}\n\n"
                    messages.append(message)
            except asyncio.CancelledError:
                # Stop thread when client disconnects
                thread_manager.stop_thread(thread_id)
                raise
            finally:
                # Clean up thread
                thread_manager.remove_thread(thread_id)
                # Save assistant message only if not in debug mode
                if not request.is_debug:
                    submit(save_conversation_assistant, request, messages, authorization)

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


# Add configuration reload API
@router.post("/reload_config")
async def reload_config():
    """
    Manually trigger configuration reload
    """
    return config_manager.force_reload()


@router.get("/list")
async def list_main_agent_info_api():
    """
    List all agents, create if the main Agent cannot be found.
    """
    try:
        return list_main_agent_info_impl()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent list error: {str(e)}")


@router.post("/search_info")
async def search_agent_info_api(request: AgentInfoRequest):
    """
    Search agent info by agent_id
    """
    try:
        return get_agent_info_impl(request.agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent search info error: {str(e)}")


@router.post("/get_creating_sub_agent_id")
async def get_creating_sub_agent_info_api(request: AgentIDRequest):
    """
    Create a new sub agent, return agent_ID
    """
    try:
        return get_creating_sub_agent_info_impl(request.agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent create error: {str(e)}")


@router.post("/update")
async def update_agent_info_api(request: AgentInfoRequest):
    """
    Update an existing agent
    """
    try:
        update_agent_info_impl(request)
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent update error: {str(e)}")


@router.delete("")
async def delete_agent_api(request: AgentIDRequest):
    """
    Delete an agent
    """
    try:
        delete_agent_impl(request.agent_id)
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent delete error: {str(e)}")



