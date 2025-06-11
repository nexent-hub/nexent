import unittest
from unittest.mock import patch, MagicMock

# Mock boto3 and minio client before importing the module under test
import sys
boto3_mock = MagicMock()
sys.modules['boto3'] = boto3_mock

# Mock MinioClient class before importing the services
minio_client_mock = MagicMock()
with patch('backend.database.client.MinioClient', return_value=minio_client_mock):
    from backend.services.agent_service import (
        get_enable_tool_id_by_agent_id,
        get_enable_sub_agent_id_by_agent_id,
        get_creating_sub_agent_id_service,
        query_sub_agents_api,
        list_main_agent_info_impl,
        get_agent_info_impl,
        get_creating_sub_agent_info_impl,
        update_agent_info_impl,
        delete_agent_impl
    )
    from backend.consts.model import AgentInfoRequest


class TestAgentService(unittest.TestCase):

    def setUp(self):
        # Reset all mocks before each test
        minio_client_mock.reset_mock()

    def test_get_enable_tool_id_by_agent_id(self):
        # Setup
        mock_tool_instances = [
            {"tool_id": 1, "enabled": True},
            {"tool_id": 2, "enabled": False},
            {"tool_id": 3, "enabled": True},
            {"tool_id": 4, "enabled": True}
        ]
        
        with patch('backend.services.agent_service.query_all_enabled_tool_instances') as mock_query:
            mock_query.return_value = mock_tool_instances
            
            # Execute
            result = get_enable_tool_id_by_agent_id(
                agent_id=123, 
                tenant_id="test_tenant", 
                user_id="test_user"
            )
            
            # Assert
            self.assertEqual(sorted(result), [1, 3, 4])
            mock_query.assert_called_once_with(
                tenant_id="test_tenant", 
                user_id="test_user", 
                agent_id=123
            )

    def test_get_enable_sub_agent_id_by_agent_id(self):
        # Setup
        mock_sub_agents = [
            {"agent_id": 101, "enabled": True},
            {"agent_id": 102, "enabled": False},
            {"agent_id": 103, "enabled": True}
        ]
        
        with patch('backend.services.agent_service.query_sub_agents') as mock_query:
            mock_query.return_value = mock_sub_agents
            
            # Execute
            result = get_enable_sub_agent_id_by_agent_id(
                agent_id=123, 
                tenant_id="test_tenant", 
                user_id="test_user"
            )
            
            # Assert
            self.assertEqual(sorted(result), [101, 103])
            mock_query.assert_called_once_with(
                main_agent_id=123, 
                tenant_id="test_tenant", 
                user_id="test_user"
            )

    @patch('backend.services.agent_service.create_agent')
    @patch('backend.services.agent_service.search_sub_agent_by_main_agent_id')
    def test_get_creating_sub_agent_id_service_existing_agent(self, mock_search, mock_create):
        # Setup - existing sub agent found
        mock_search.return_value = 456
        
        # Execute
        result = get_creating_sub_agent_id_service(
            main_agent_id=123, 
            tenant_id="test_tenant", 
            user_id="test_user"
        )
        
        # Assert
        self.assertEqual(result, 456)
        mock_search.assert_called_once_with(123, "test_tenant")
        mock_create.assert_not_called()

    @patch('backend.services.agent_service.create_agent')
    @patch('backend.services.agent_service.search_sub_agent_by_main_agent_id')
    def test_get_creating_sub_agent_id_service_new_agent(self, mock_search, mock_create):
        # Setup - no existing sub agent found
        mock_search.return_value = None
        mock_create.return_value = {"agent_id": 789}
        
        # Execute
        result = get_creating_sub_agent_id_service(
            main_agent_id=123, 
            tenant_id="test_tenant", 
            user_id="test_user"
        )
        
        # Assert
        self.assertEqual(result, 789)
        mock_search.assert_called_once_with(123, "test_tenant")
        mock_create.assert_called_once_with(
            agent_info={"enabled": False, "parent_agent_id": 123},
            tenant_id="test_tenant",
            user_id="test_user"
        )

    @patch('backend.services.agent_service.search_tools_for_sub_agent')
    @patch('backend.services.agent_service.query_sub_agents')
    def test_query_sub_agents_api(self, mock_query_sub_agents, mock_search_tools):
        # Setup
        mock_sub_agents = [
            {"agent_id": 101, "name": "Agent 1"},
            {"agent_id": 102, "name": "Agent 2"}
        ]
        mock_query_sub_agents.return_value = mock_sub_agents
        
        mock_search_tools.side_effect = [
            [{"tool_id": 1, "name": "Tool 1"}],
            [{"tool_id": 2, "name": "Tool 2"}]
        ]
        
        # Execute
        result = query_sub_agents_api(
            main_agent_id=123, 
            tenant_id="test_tenant", 
            user_id="test_user"
        )
        
        # Assert
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["tools"], [{"tool_id": 1, "name": "Tool 1"}])
        self.assertEqual(result[1]["tools"], [{"tool_id": 2, "name": "Tool 2"}])
        
        mock_query_sub_agents.assert_called_once_with(123, "test_tenant", "test_user")
        self.assertEqual(mock_search_tools.call_count, 2)

    @patch('backend.services.agent_service.get_enable_sub_agent_id_by_agent_id')
    @patch('backend.services.agent_service.get_enable_tool_id_by_agent_id')
    @patch('backend.services.agent_service.query_sub_agents_api')
    @patch('backend.services.agent_service.search_agent_info_by_agent_id')
    @patch('backend.services.agent_service.query_or_create_main_agents_api')
    @patch('backend.services.agent_service.get_user_info')
    def test_list_main_agent_info_impl_success(self, mock_get_user_info, mock_query_main_agent,
                                              mock_search_agent_info, mock_query_sub_agents,
                                              mock_get_enable_tools, mock_get_enable_agents):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_query_main_agent.return_value = 123
        mock_search_agent_info.return_value = {
            "model_name": "gpt-4",
            "max_steps": 10,
            "business_description": "Test agent",
            "prompt": "Test prompt"
        }
        mock_query_sub_agents.return_value = [{"agent_id": 456, "name": "Sub Agent"}]
        mock_get_enable_tools.return_value = [1, 2, 3]
        mock_get_enable_agents.return_value = [456]
        
        # Execute
        result = list_main_agent_info_impl()
        
        # Assert
        expected_result = {
            "main_agent_id": 123,
            "sub_agent_list": [{"agent_id": 456, "name": "Sub Agent"}],
            "enable_tool_id_list": [1, 2, 3],
            "enable_agent_id_list": [456],
            "model_name": "gpt-4",
            "max_steps": 10,
            "business_description": "Test agent",
            "prompt": "Test prompt"
        }
        self.assertEqual(result, expected_result)

    @patch('backend.services.agent_service.search_agent_info_by_agent_id')
    @patch('backend.services.agent_service.get_user_info')
    def test_get_agent_info_impl_success(self, mock_get_user_info, mock_search_agent_info):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_agent_info = {
            "agent_id": 123,
            "model_name": "gpt-4",
            "business_description": "Test agent"
        }
        mock_search_agent_info.return_value = mock_agent_info
        
        # Execute
        result = get_agent_info_impl(123)
        
        # Assert
        self.assertEqual(result, mock_agent_info)
        mock_search_agent_info.assert_called_once_with(123, "test_tenant", "test_user")

    @patch('backend.services.agent_service.get_enable_tool_id_by_agent_id')
    @patch('backend.services.agent_service.search_agent_info_by_agent_id')
    @patch('backend.services.agent_service.get_creating_sub_agent_id_service')
    @patch('backend.services.agent_service.get_user_info')
    def test_get_creating_sub_agent_info_impl_success(self, mock_get_user_info, mock_get_creating_sub_agent,
                                                     mock_search_agent_info, mock_get_enable_tools):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_get_creating_sub_agent.return_value = 456
        mock_search_agent_info.return_value = {
            "model_name": "gpt-4",
            "max_steps": 5,
            "business_description": "Sub agent",
            "prompt": "Sub prompt"
        }
        mock_get_enable_tools.return_value = [1, 2]
        
        # Execute
        result = get_creating_sub_agent_info_impl(123)
        
        # Assert
        expected_result = {
            "agent_id": 456,
            "enable_tool_id_list": [1, 2],
            "model_name": "gpt-4",
            "max_steps": 5,
            "business_description": "Sub agent",
            "prompt": "Sub prompt"
        }
        self.assertEqual(result, expected_result)

    @patch('backend.services.agent_service.update_agent')
    @patch('backend.services.agent_service.get_user_info')
    def test_update_agent_info_impl_success(self, mock_get_user_info, mock_update_agent):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        request = AgentInfoRequest(
            agent_id=123,
            model_name="gpt-4",
            business_description="Updated agent"
        )
        
        # Execute
        update_agent_info_impl(request)
        
        # Assert
        mock_update_agent.assert_called_once_with(123, request, "test_tenant", "test_user")

    @patch('backend.services.agent_service.delete_agent_by_id')
    @patch('backend.services.agent_service.get_user_info')
    def test_delete_agent_impl_success(self, mock_get_user_info, mock_delete_agent):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        
        # Execute
        delete_agent_impl(123)
        
        # Assert
        mock_delete_agent.assert_called_once_with(123, "test_tenant", "test_user")

    @patch('backend.services.agent_service.query_or_create_main_agents_api')
    @patch('backend.services.agent_service.get_user_info')
    def test_list_main_agent_info_impl_exception_handling(self, mock_get_user_info, mock_query_main_agent):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_query_main_agent.side_effect = Exception("Database error")
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            list_main_agent_info_impl()
        
        self.assertIn("Failed to get main agent id", str(context.exception))

    @patch('backend.services.agent_service.search_agent_info_by_agent_id')
    @patch('backend.services.agent_service.get_user_info')
    def test_get_agent_info_impl_exception_handling(self, mock_get_user_info, mock_search_agent_info):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_search_agent_info.side_effect = Exception("Database error")
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            get_agent_info_impl(123)
        
        self.assertIn("Failed to get agent info", str(context.exception))

    @patch('backend.services.agent_service.update_agent')
    @patch('backend.services.agent_service.get_user_info')
    def test_update_agent_info_impl_exception_handling(self, mock_get_user_info, mock_update_agent):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_update_agent.side_effect = Exception("Update failed")
        request = AgentInfoRequest(agent_id=123, model_name="gpt-4")
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            update_agent_info_impl(request)
        
        self.assertIn("Failed to update agent info", str(context.exception))

    @patch('backend.services.agent_service.delete_agent_by_id')
    @patch('backend.services.agent_service.get_user_info')
    def test_delete_agent_impl_exception_handling(self, mock_get_user_info, mock_delete_agent):
        # Setup
        mock_get_user_info.return_value = ("test_user", "test_tenant")
        mock_delete_agent.side_effect = Exception("Delete failed")
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            delete_agent_impl(123)
        
        self.assertIn("Failed to delete agent", str(context.exception))


if __name__ == '__main__':
    unittest.main() 