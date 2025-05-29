import unittest
from unittest.mock import patch, MagicMock, mock_open

from backend.services.knowledge_summary_service import (
    load_knowledge_prompts,
    generate_knowledge_summary_stream
)


class TestKnowledgeSummaryService(unittest.TestCase):
    
    @patch('backend.services.knowledge_summary_service.open', new_callable=mock_open, 
           read_data="system_prompt: 'System prompt text'\nuser_prompt: 'User prompt text {content}'")
    @patch('backend.services.knowledge_summary_service.yaml.safe_load')
    def test_load_knowledge_prompts(self, mock_yaml_load, mock_file):
        # Setup
        mock_yaml_data = {
            "system_prompt": "System prompt text",
            "user_prompt": "User prompt text {content}"
        }
        mock_yaml_load.return_value = mock_yaml_data
        
        # Execute
        result = load_knowledge_prompts()
        
        # Assert
        self.assertEqual(result, mock_yaml_data)
        mock_file.assert_called_once_with('backend/prompts/knowledge_summary_agent.yaml', 'r', encoding='utf-8')
        mock_yaml_load.assert_called_once()

    @patch('backend.services.knowledge_summary_service.load_dotenv')
    @patch('backend.services.knowledge_summary_service.load_knowledge_prompts')
    @patch('backend.services.knowledge_summary_service.OpenAI')
    @patch('backend.services.knowledge_summary_service.os.getenv')
    def test_generate_knowledge_summary_stream_success(self, mock_getenv, mock_openai, mock_load_prompts, mock_load_dotenv):
        # Setup
        mock_load_prompts.return_value = {
            "system_prompt": "System prompt text",
            "user_prompt": "User prompt text {content}"
        }
        
        mock_getenv.side_effect = lambda key: {
            'LLM_SECONDARY_API_KEY': 'test-api-key',
            'LLM_SECONDARY_MODEL_URL': 'http://test-url.com',
            'LLM_SECONDARY_MODEL_NAME': 'test-model'
        }.get(key)
        
        # Mock OpenAI client and completion stream
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        
        # Create mock chunks for the stream
        mock_chunk1 = MagicMock()
        mock_chunk1.choices = [MagicMock()]
        mock_chunk1.choices[0].delta.content = "This is "
        
        mock_chunk2 = MagicMock()
        mock_chunk2.choices = [MagicMock()]
        mock_chunk2.choices[0].delta.content = "a test "
        
        mock_chunk3 = MagicMock()
        mock_chunk3.choices = [MagicMock()]
        mock_chunk3.choices[0].delta.content = "summary"
        
        mock_stream = [mock_chunk1, mock_chunk2, mock_chunk3]
        mock_client.chat.completions.create.return_value = mock_stream
        
        # Execute
        generator = generate_knowledge_summary_stream("AI, machine learning, data")
        results = list(generator)
        
        # Assert
        self.assertEqual(results, ["This is ", "a test ", "summary", "END"])
        
        # Verify OpenAI client was initialized correctly
        mock_openai.assert_called_once_with(
            api_key='test-api-key',
            base_url='http://test-url.com'
        )
        
        # Verify completion was created with correct parameters
        mock_client.chat.completions.create.assert_called_once()
        call_args = mock_client.chat.completions.create.call_args[1]
        self.assertEqual(call_args['model'], 'test-model')
        self.assertEqual(call_args['stream'], True)
        self.assertEqual(len(call_args['messages']), 2)
        self.assertEqual(call_args['messages'][0]['role'], 'system')
        self.assertEqual(call_args['messages'][1]['role'], 'user')

    @patch('backend.services.knowledge_summary_service.load_dotenv')
    @patch('backend.services.knowledge_summary_service.load_knowledge_prompts')
    @patch('backend.services.knowledge_summary_service.OpenAI')
    @patch('backend.services.knowledge_summary_service.os.getenv')
    def test_generate_knowledge_summary_stream_exception(self, mock_getenv, mock_openai, mock_load_prompts, mock_load_dotenv):
        # Setup
        mock_load_prompts.return_value = {
            "system_prompt": "System prompt text",
            "user_prompt": "User prompt text {content}"
        }
        
        mock_getenv.side_effect = lambda key: {
            'LLM_SECONDARY_API_KEY': 'test-api-key',
            'LLM_SECONDARY_MODEL_URL': 'http://test-url.com',
            'LLM_SECONDARY_MODEL_NAME': 'test-model'
        }.get(key)
        
        # Mock OpenAI client that raises an exception
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API error")
        
        # Execute
        generator = generate_knowledge_summary_stream("AI, machine learning, data")
        results = list(generator)
        
        # Assert - should yield an error message
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0].startswith("错误: "))
        self.assertIn("API error", results[0])


if __name__ == '__main__':
    unittest.main() 