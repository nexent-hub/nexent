import asyncio
import json
import logging
from functools import partial

from fastapi import HTTPException, APIRouter
from fastapi.responses import StreamingResponse

from consts.model import GeneratePromptRequest, FineTunePromptRequest
from services.prompt_service import generate_and_save_system_prompt_impl, fine_tune_prompt

router = APIRouter(prefix="/prompt")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prompt app")


@router.post("/generate")
async def generate_and_save_system_prompt_api(request: GeneratePromptRequest):
    try:
        def gen_system_prompt():
            for system_prompt in generate_and_save_system_prompt_impl(
                    agent_id=request.agent_id,
                    task_description=request.task_description
            ):
                # SSE format, each message ends with \n\n
                yield f"data: {json.dumps({'success': True, 'data': system_prompt}, ensure_ascii=False)}\n\n"

        return StreamingResponse(gen_system_prompt(), media_type="text/event-stream")
    except Exception as e:
        logger.exception(f"Error occurred while generating system prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error occurred while generating system prompt: {str(e)}")


@router.post("/fine_tune")
async def fine_tune_system_prompt_api(request: FineTunePromptRequest):
    try:
        # Using run_in_executor to convert synchronous functions for asynchronous execution
        loop = asyncio.get_event_loop()
        system_prompt = await loop.run_in_executor(
            None,
            partial(
                fine_tune_prompt,
                system_prompt=request.system_prompt,
                command=request.command
            )
        )
        return {"success": True, "data": system_prompt}
    except Exception as e:
        logger.exception(f"Error occurred while fine tuning system prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error occurred while fine tuning system prompt: {str(e)}")
