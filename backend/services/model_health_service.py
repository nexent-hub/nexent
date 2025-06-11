import logging
import httpx
import requests
from nexent.core import MessageObserver
from nexent.core.models import OpenAIModel, OpenAIVLModel
from nexent.core.models.embedding_model import JinaEmbedding, OpenAICompatibleEmbedding

from apps.voice_app import VoiceService
from consts.const import MODEL_ENGINE_APIKEY, MODEL_ENGINE_HOST
from consts.model import ModelConnectStatusEnum, ModelResponse
from database.model_management_db import get_model_by_display_name, update_model_record


async def check_model_connectivity(display_name: str):
    try:
        # 用 display_name 查库
        model = get_model_by_display_name(display_name)
        if not model:
            return ModelResponse(code=404, message=f"Model configuration not found for {display_name}",
                data={"connectivity": False, "connect_status": "未找到"})
            
        # 仍然用 repo/name 拼接用于模型实例化
        repo, name = model.get("model_repo", ""), model.get("model_name", "")
        model_name = f"{repo}/{name}" if repo else name
        log_str = f"Checking model connectivity: {model_name}; "
        if model.get("base_url"):
            log_str += f"base_url: {model.get('base_url')}; "
        if model.get("api_key"):
            log_str += f"api_key: {model.get('api_key')}; "
        logging.info(log_str)
        
        # Set model to "detecting" status
        update_data = {"connect_status": ModelConnectStatusEnum.DETECTING.value}
        update_model_record(model["model_id"], update_data)
        
        model_type = model["model_type"]
        model_base_url = model["base_url"]
        model_api_key = model["api_key"]
        
        connectivity: bool
        # Test connectivity based on different model types
        if model_type == "embedding":
            connectivity = OpenAICompatibleEmbedding(model_name=model_name, base_url=model_base_url, api_key=model_api_key, embedding_dim=1024).check_connectivity()
        elif model_type == "multi_embedding":
            connectivity = JinaEmbedding(model_name=model_name, base_url=model_base_url, api_key=model_api_key, embedding_dim=1024).check_connectivity()
        elif model_type == "llm":
            observer = MessageObserver()
            connectivity = OpenAIModel(observer, model_id=model_name, api_base=model_base_url, api_key=model_api_key).check_connectivity()
        elif model_type == "rerank":
            connectivity = False
        elif model_type == "vlm":
            observer = MessageObserver()
            connectivity = OpenAIVLModel(observer, model_id=model_name, api_base=model_base_url, api_key=model_api_key).check_connectivity()
        elif model_type in ["tts", "stt"]:
            connectivity = await VoiceService().check_connectivity(model_type)
        else:
            update_data = {"connect_status": ModelConnectStatusEnum.UNAVAILABLE.value}
            logging.error(f"Unsupported model type: {model_type}")
            update_model_record(model["model_id"], update_data)
            return ModelResponse(code=400, message=f"Unsupported model type: {model_type}",
                data={"connectivity": False, "connect_status": ModelConnectStatusEnum.UNAVAILABLE.value})
        connect_status = ModelConnectStatusEnum.AVAILABLE.value if connectivity else ModelConnectStatusEnum.UNAVAILABLE.value
        update_data = {"connect_status": connect_status}
        update_model_record(model["model_id"], update_data)
        return ModelResponse(code=200, message=f"Model {display_name} connectivity {'successful' if connectivity else 'failed'}",
            data={"connectivity": connectivity, "connect_status": connect_status})
    except Exception as e:
        if 'model' in locals() and model:
            update_data = {"connect_status": ModelConnectStatusEnum.UNAVAILABLE.value}
            update_model_record(model["model_id"], update_data)
        return ModelResponse(code=500, message=f"Connectivity test error: {str(e)}",
            data={"connectivity": False, "connect_status": ModelConnectStatusEnum.UNAVAILABLE.value})


async def check_me_model_connectivity(model_name: str):
    try:
        headers = {'Authorization': f'Bearer {MODEL_ENGINE_APIKEY}'}
        async with httpx.AsyncClient(verify=False) as client:
            # Get models list
            response = await client.get(f"{MODEL_ENGINE_HOST}/open/router/v1/models", headers=headers)
            response.raise_for_status()
            result = response.json()['data']

            # Find model
            model_data = next((item for item in result if item['id'] == model_name), None)
            if not model_data:
                return ModelResponse(code=404, message="Specified model not found",
                    data={"connectivity": False, "message": "Specified model not found", "connect_status": ""})

            model_type = model_data['type']

            # Test model based on type
            if model_type == 'llm':
                payload = {"model": model_name, "messages": [{"role": "user", "content": "hello"}]}
                api_response = await client.post(
                    f"{MODEL_ENGINE_HOST}/open/router/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
            elif model_type == 'embedding':
                payload = {"model": model_name, "input": "Hello"}
                api_response = await client.post(
                    f"{MODEL_ENGINE_HOST}/open/router/v1/embeddings",
                    headers=headers,
                    json=payload
                )
            else:
                return ModelResponse(code=400, message=f"Health check not supported for {model_type} type models",
                    data={"connectivity": False, "message": f"Health check not supported for {model_type} type models",
                          "connect_status": ModelConnectStatusEnum.UNAVAILABLE.value})

            status_code = api_response.status_code
            response_text = api_response.text

            if status_code == 200:
                connect_status = ModelConnectStatusEnum.AVAILABLE.value
                return ModelResponse(code=200, message=f"Model {model_name} responded normally",
                    data={"connectivity": True, "message": f"Model {model_name} responded normally", "connect_status": connect_status})
            else:
                connect_status = ModelConnectStatusEnum.UNAVAILABLE.value
                return ModelResponse(code=status_code, message=f"Model {model_name} response failed",
                    data={"connectivity": False, "message": f"Model {model_name} response failed: {response_text}",
                          "connect_status": connect_status})

    except Exception as e:
        return ModelResponse(code=500, message=f"Unknown error occurred: {str(e)}",
            data={"connectivity": False, "message": f"Unknown error occurred: {str(e)}",
                  "connect_status": ModelConnectStatusEnum.UNAVAILABLE.value})
