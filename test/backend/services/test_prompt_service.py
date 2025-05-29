import unittest
from unittest.mock import patch, MagicMock, mock_open

# Mock boto3 and minio client before importing the module under test
import sys
boto3_mock = MagicMock()
sys.modules['boto3'] = boto3_mock

# Mock MinioClient class before importing the services
minio_client_mock = MagicMock()
with patch('backend.database.client.MinioClient', return_value=minio_client_mock):
    from jinja2 import StrictUndefined

    from backend.services.prompt_service import (
        call_llm_for_system_prompt,
        generate_and_save_system_prompt_impl,
        get_enabled_tool_description_for_generate_prompt,
        get_enabled_sub_agent_description_for_generate_prompt,
        fine_tune_prompt,
        save_prompt_impl,
        generate_system_prompt,
        join_info_for_generate_system_prompt
    )
    from backend.consts.model import AgentInfoRequest


class TestPromptService(unittest.TestCase):
    
    def setUp(self):
        # Reset all mocks before each test
        minio_client_mock.reset_mock()

    @patch('backend.services.prompt_service.OpenAIServerModel')
    @patch('backend.services.prompt_service.config_manager')
    def test_call_llm_for_system_prompt(self, mock_config_manager, mock_openai):
        # Setup
        mock_config_manager.get_config.side_effect = lambda key: {
            'LLM_MODEL_NAME': 'gpt-4',
            'LLM_MODEL_URL': 'http://example.com',
            'LLM_API_KEY': 'fake-key'
        }.get(key)
        
        mock_llm_instance = mock_openai.return_value
        mock_response = MagicMock()
        mock_response.content = "Generated prompt"
        mock_llm_instance.return_value = mock_response
        
        # Execute
        result = call_llm_for_system_prompt("user prompt", "system prompt")
        
        # Assert
        self.assertEqual(result, "Generated prompt")
        mock_openai.assert_called_once_with(
            model_id='gpt-4',
            api_base='http://example.com',
            api_key='fake-key',
            temperature=0.3,
            top_p=0.95
        )
        mock_llm_instance.assert_called_once()
        
    @patch('backend.services.prompt_service.generate_system_prompt')
    @patch('backend.services.prompt_service.get_enabled_sub_agent_description_for_generate_prompt')
    @patch('backend.services.prompt_service.get_enabled_tool_description_for_generate_prompt')
    @patch('backend.services.prompt_service.get_user_info')
    @patch('backend.services.prompt_service.update_agent')
    def test_generate_and_save_system_prompt_impl(self, mock_update_agent, mock_get_user_info, 
                                         mock_get_tool_desc, mock_get_agent_desc, 
                                         mock_generate_system_prompt):
        # Setup
        mock_get_user_info.return_value = ("user123", "tenant456")
        
        mock_tool1 = {"name": "tool1", "description": "Tool 1 desc", "inputs": "input1", "output_type": "output1"}
        mock_tool2 = {"name": "tool2", "description": "Tool 2 desc", "inputs": "input2", "output_type": "output2"}
        mock_get_tool_desc.return_value = [mock_tool1, mock_tool2]
        
        mock_agent1 = {"name": "agent1", "description": "Agent 1 desc", "enabled": True}
        mock_agent2 = {"name": "agent2", "description": "Agent 2 desc", "enabled": True}
        mock_get_agent_desc.return_value = [mock_agent1, mock_agent2]
        
        mock_generate_system_prompt.return_value = "Final populated prompt"
        
        # Execute
        result = generate_and_save_system_prompt_impl(123, "Test task")
        
        # Assert
        self.assertEqual(result, "Final populated prompt")
        mock_get_user_info.assert_called_once()
        mock_get_tool_desc.assert_called_once_with(tenant_id="tenant456", agent_id=123, user_id="user123")
        mock_get_agent_desc.assert_called_once_with(tenant_id="tenant456", agent_id=123, user_id="user123")
        
        mock_generate_system_prompt.assert_called_once_with(
            mock_get_agent_desc.return_value,
            "Test task",
            mock_get_tool_desc.return_value
        )
        
        mock_update_agent.assert_called_once()
        agent_info = mock_update_agent.call_args[1]['agent_info']
        # Check object attributes instead of exact type due to module loading issues
        self.assertEqual(agent_info.agent_id, 123)
        self.assertEqual(agent_info.business_description, "Test task")
        self.assertEqual(agent_info.prompt, "Final populated prompt")
        # Verify it has the expected AgentInfoRequest structure
        self.assertTrue(hasattr(agent_info, 'agent_id'))
        self.assertTrue(hasattr(agent_info, 'business_description'))
        self.assertTrue(hasattr(agent_info, 'prompt'))

    @patch('backend.services.prompt_service.call_llm_for_system_prompt')
    @patch('backend.services.prompt_service.join_info_for_generate_system_prompt')
    @patch('backend.services.prompt_service.populate_template')
    @patch('backend.services.prompt_service.open', new_callable=mock_open)
    @patch('backend.services.prompt_service.yaml.safe_load')
    def test_generate_system_prompt(self, mock_yaml_load, mock_open_file, 
                                   mock_populate_template, mock_join_info, 
                                   mock_call_llm):
        # Setup
        mock_yaml_data = {
            "USER_PROMPT": "Test User Prompt",
            "DUTY_SYSTEM_PROMPT": "Duty System Prompt",
            "CONSTRAINT_SYSTEM_PROMPT": "Constraint System Prompt",
            "FEW_SHOTS_SYSTEM_PROMPT": "Few Shots System Prompt"
        }
        mock_yaml_load.side_effect = [mock_yaml_data, {"system_prompt": "Template prompt"}]
        
        mock_sub_agents = [{"name": "agent1", "description": "Agent 1"}]
        mock_task_description = "Test task"
        mock_tools = [{"name": "tool1", "description": "Tool 1"}]
        
        mock_join_info.return_value = "Joined content"
        mock_call_llm.side_effect = ["duty result", "constraint result", "few_shots result"]
        mock_populate_template.return_value = "Final populated prompt"
        
        # Execute
        result = generate_system_prompt(mock_sub_agents, mock_task_description, mock_tools)
        
        # Assert
        self.assertEqual(result, "Final populated prompt")
        mock_join_info.assert_called_once_with(
            mock_yaml_data, mock_sub_agents, mock_task_description, mock_tools
        )
        self.assertEqual(mock_call_llm.call_count, 3)
        mock_populate_template.assert_called_once()
        # Check variables passed to populate_template
        variables = mock_populate_template.call_args[1]['variables']
        self.assertEqual(variables["duty"], "duty result")
        self.assertEqual(variables["constraint"], "constraint result")
        self.assertEqual(variables["few_shots"], "few_shots result")
        self.assertTrue("tools" in variables)
        self.assertTrue("managed_agents" in variables)
        self.assertTrue("authorized_imports" in variables)
        
    @patch('backend.services.prompt_service.Template')
    def test_join_info_for_generate_system_prompt(self, mock_template):
        # Setup
        mock_prompt_for_generate = {"USER_PROMPT": "Test User Prompt"}
        mock_sub_agents = [
            {"name": "agent1", "description": "Agent 1 desc"},
            {"name": "agent2", "description": "Agent 2 desc"}
        ]
        mock_task_description = "Test task"
        mock_tools = [
            {"name": "tool1", "description": "Tool 1 desc", "inputs": "input1", "output_type": "output1"},
            {"name": "tool2", "description": "Tool 2 desc", "inputs": "input2", "output_type": "output2"}
        ]
        
        mock_template_instance = MagicMock()
        mock_template.return_value = mock_template_instance
        mock_template_instance.render.return_value = "Rendered content"
        
        # Execute
        result = join_info_for_generate_system_prompt(
            mock_prompt_for_generate, mock_sub_agents, mock_task_description, mock_tools
        )
        
        # Assert
        self.assertEqual(result, "Rendered content")
        mock_template.assert_called_once_with(mock_prompt_for_generate["USER_PROMPT"], undefined=StrictUndefined)
        mock_template_instance.render.assert_called_once()
        # Check template variables
        template_vars = mock_template_instance.render.call_args[0][0]
        self.assertTrue("tool_description" in template_vars)
        self.assertTrue("agent_description" in template_vars)
        self.assertEqual(template_vars["task_description"], mock_task_description)
        
    @patch('backend.services.prompt_service.get_enable_tool_id_by_agent_id')
    @patch('backend.services.prompt_service.query_tools_by_ids')
    def test_get_enabled_tool_description_for_generate_prompt(self, mock_query_tools, mock_get_tool_ids):
        # Setup
        mock_get_tool_ids.return_value = [1, 2, 3]
        mock_tools = [{"id": 1, "name": "tool1"}, {"id": 2, "name": "tool2"}, {"id": 3, "name": "tool3"}]
        mock_query_tools.return_value = mock_tools
        
        # Execute
        result = get_enabled_tool_description_for_generate_prompt(
            agent_id=123, 
            tenant_id="tenant456", 
            user_id="user123"
        )
        
        # Assert
        self.assertEqual(result, mock_tools)
        mock_get_tool_ids.assert_called_once_with(agent_id=123, tenant_id="tenant456", user_id="user123")
        mock_query_tools.assert_called_once_with([1, 2, 3])
        
    @patch('backend.services.prompt_service.query_sub_agents')
    def test_get_enabled_sub_agent_description_for_generate_prompt(self, mock_query_sub_agents):
        # Setup
        mock_agents = [
            {"id": 1, "name": "agent1", "enabled": True},
            {"id": 2, "name": "agent2", "enabled": False},  # This one should be filtered out
            {"id": 3, "name": "agent3", "enabled": True}
        ]
        mock_query_sub_agents.return_value = mock_agents
        
        # Execute
        result = get_enabled_sub_agent_description_for_generate_prompt(
            agent_id=123, 
            tenant_id="tenant456", 
            user_id="user123"
        )
        
        # Assert
        expected_result = [
            {"id": 1, "name": "agent1", "enabled": True},
            {"id": 3, "name": "agent3", "enabled": True}
        ]
        self.assertEqual(result, expected_result)
        mock_query_sub_agents.assert_called_once_with(main_agent_id=123, tenant_id="tenant456", user_id="user123")
        
    @patch('backend.services.prompt_service.call_llm_for_system_prompt')
    @patch('backend.services.prompt_service.open', new_callable=mock_open, read_data="""
FINE_TUNE_USER_PROMPT: "Test Fine Tune User Prompt {{prompt}} {{command}}"
FINE_TUNE_SYSTEM_PROMPT: "Fine Tune System Prompt"
""")
    @patch('backend.services.prompt_service.yaml.safe_load')
    def test_fine_tune_prompt(self, mock_yaml_load, mock_open_file, mock_call_llm):
        # Setup
        mock_yaml_data = {
            "FINE_TUNE_USER_PROMPT": "Test Fine Tune User Prompt {{prompt}} {{command}}",
            "FINE_TUNE_SYSTEM_PROMPT": "Fine Tune System Prompt"
        }
        mock_yaml_load.return_value = mock_yaml_data
        mock_call_llm.return_value = "Fine-tuned prompt result"
        
        # Execute
        result = fine_tune_prompt("Original prompt", "Command")
        
        # Assert
        self.assertEqual(result, "Fine-tuned prompt result")
        mock_call_llm.assert_called_once()
        
    @patch('backend.services.prompt_service.get_user_info')
    @patch('backend.services.prompt_service.save_agent_prompt')
    def test_save_prompt_impl(self, mock_save_agent_prompt, mock_get_user_info):
        # Setup
        mock_get_user_info.return_value = ("user123", "tenant456")
        mock_save_agent_prompt.return_value = {"success": True}
        
        # Execute
        result = save_prompt_impl(123, "Test prompt")
        
        # Assert
        self.assertEqual(result, {"success": True})
        mock_get_user_info.assert_called_once()
        mock_save_agent_prompt.assert_called_once_with(
            agent_id=123,
            prompt="Test prompt",
            tenant_id="tenant456"
        )
        
    @patch('backend.services.prompt_service.OpenAIServerModel')
    @patch('backend.services.prompt_service.config_manager')
    def test_call_llm_for_system_prompt_exception(self, mock_config_manager, mock_openai):
        # Setup
        mock_config_manager.get_config.side_effect = lambda key: {
            'LLM_MODEL_NAME': 'gpt-4',
            'LLM_MODEL_URL': 'http://example.com',
            'LLM_API_KEY': 'fake-key'
        }.get(key)
        
        mock_llm_instance = mock_openai.return_value
        mock_llm_instance.side_effect = Exception("LLM error")
        
        # Execute and Assert
        with self.assertRaises(Exception) as context:
            call_llm_for_system_prompt("user prompt", "system prompt")
            
        self.assertTrue("LLM error" in str(context.exception))


if __name__ == '__main__':
    unittest.main()
