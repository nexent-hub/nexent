"use client"

import { useState, useRef } from 'react'
import { Typography, Input, Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { conversationService } from '@/services/conversationService'
import { handleStreamResponse } from '@/app/chat/streaming/chatStreamHandler'
import { ChatMessageType, TaskMessageType } from '@/types/chat'
import { ChatStreamFinalMessage } from '@/app/chat/streaming/chatStreamFinalMessage'
import { TaskWindow } from '@/app/chat/streaming/taskWindow'

const { Text } = Typography

// Agent debugging component Props interface
interface AgentDebuggingProps {
  question: string;
  answer: string;
  onAskQuestion: (question: string) => void;
  isStreaming: boolean;
  messages: ChatMessageType[];
  taskMessages: TaskMessageType[];
  conversationGroups: Map<string, TaskMessageType[]>;
}

// Main component Props interface
interface DebugConfigProps {
  testQuestion: string;
  setTestQuestion: (question: string) => void;
  testAnswer: string;
  setTestAnswer: (answer: string) => void;
  agentId?: number; // Make agentId an optional prop
}

// Counter for generating unique IDs
const stepIdCounter = { current: 0 };

/**
 * Agent debugging component
 */
function AgentDebugging({ 
  question, 
  answer, 
  onAskQuestion,
  isStreaming,
  messages,
  taskMessages,
  conversationGroups
}: AgentDebuggingProps) {
  const [inputQuestion, setInputQuestion] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const handleSend = async () => {
    if (!inputQuestion.trim()) return;
    
    // Create a new AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      // Call the parent component's processing function
      await onAskQuestion(inputQuestion);
      setInputQuestion("");
    } catch (error) {
      console.error("发送问题失败:", error);
    } finally {
      abortControllerRef.current = null;
    }
  }
  
  // Process the step content of the message
  const processMessageSteps = (message: ChatMessageType): TaskMessageType[] => {
    if (!message.steps || message.steps.length === 0) return [];
    
    const taskMsgs: TaskMessageType[] = [];
    message.steps.forEach(step => {
      // Process step.contents
      if (step.contents && step.contents.length > 0) {
        step.contents.forEach(content => {
          taskMsgs.push({
            id: content.id,
            role: "assistant",
            content: content.content,
            timestamp: new Date(),
            type: content.type
          });
        });
      }
      
      // Process step.thinking
      if (step.thinking && step.thinking.content) {
        taskMsgs.push({
          id: `thinking-${step.id}`,
          role: "assistant",
          content: step.thinking.content,
          timestamp: new Date(),
          type: "model_output_thinking"
        });
      }
      
      // Process step.code 
      if (step.code && step.code.content) {
        taskMsgs.push({
          id: `code-${step.id}`,
          role: "assistant",
          content: step.code.content,
          timestamp: new Date(),
          type: "model_output_code"
        });
      }
      
      // Process step.output
      if (step.output && step.output.content) {
        taskMsgs.push({
          id: `output-${step.id}`,
          role: "assistant",
          content: step.output.content,
          timestamp: new Date(),
          type: "tool"
        });
      }
    });
    
    return taskMsgs;
  };
  
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex flex-col gap-4 flex-grow overflow-hidden">
        {/* Message display area */}
        <div className="flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar">
          {messages.map((message, index) => {
            // Process the task content of the current message
            const currentTaskMessages = message.role === "assistant" ? processMessageSteps(message) : [];
            
            return (
              <div key={message.id || index} className="flex flex-col gap-2">
                {/* User message */}
                {message.role === "user" && (
                  <ChatStreamFinalMessage
                    message={message}
                    onSelectMessage={() => {}}
                    isSelected={false}
                    searchResultsCount={message.searchResults?.length || 0}
                    imagesCount={message.images?.length || 0}
                    onImageClick={() => {}}
                    onOpinionChange={() => {}}
                    hideButtons={true}
                  />
                )}
                
                {/* Assistant message task window */}
                {message.role === "assistant" && currentTaskMessages.length > 0 && (
                  <TaskWindow
                    messages={currentTaskMessages}
                    isStreaming={isStreaming && index === messages.length - 1}
                  />
                )}
                
                {/* Assistant message final answer */}
                {message.role === "assistant" && (
                  <ChatStreamFinalMessage
                    message={message}
                    onSelectMessage={() => {}}
                    isSelected={false}
                    searchResultsCount={message.searchResults?.length || 0}
                    imagesCount={message.images?.length || 0}
                    onImageClick={() => {}}
                    onOpinionChange={() => {}}
                    hideButtons={true}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <Input
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="输入测试问题..."
          onPressEnter={handleSend}
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming}
          className={`min-w-[56px] px-4 py-1.5 rounded-md flex items-center justify-center text-sm ${
            isStreaming 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } whitespace-nowrap`}
          style={{ border: "none" }}
        >
          {isStreaming ? '调试中...' : '发送'}
        </button>
      </div>
    </div>
  )
}

/**
 * Debug configuration main component
 */
export default function DebugConfig({
  testQuestion,
  setTestQuestion,
  testAnswer,
  setTestAnswer,
  agentId
}: DebugConfigProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [taskMessages, setTaskMessages] = useState<TaskMessageType[]>([]);
  const [conversationGroups] = useState<Map<string, TaskMessageType[]>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timeout timer
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsStreaming(false);
    }, 30000); // 30 seconds timeout
  };

  // Process test question
  const handleTestQuestion = async (question: string) => {
    setTestQuestion(question);
    setIsStreaming(true);
    
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date()
    };
    
    // Add assistant message (initial state)
    const assistantMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isComplete: false
    };
    
    setMessages([userMessage, assistantMessage]);
    
    try {
      console.log("Debug - Agent ID before API call:", agentId);
      
      // Ensure agent_id is a number
      let agentIdValue = undefined;
      if (agentId !== undefined && agentId !== null) {
        agentIdValue = Number(agentId);
        if (isNaN(agentIdValue)) {
          agentIdValue = undefined;
        }
      }
      
      console.log("Debug - Parsed agent_id:", agentIdValue);
      
      // Call agent_run
      const reader = await conversationService.runAgent({
        query: question,
        conversation_id: -1, // Debug mode does not need to save conversation
        is_set: true,
        history: [],
        is_debug: true,  // Add debug mode flag
        agent_id: agentIdValue  // Use the properly parsed agent_id
      });

      if (!reader) throw new Error("Response body is null");

      // Process stream response
      await handleStreamResponse(
        reader,
        setMessages,
        resetTimeout,
        stepIdCounter,
        () => {}, // setIsSwitchedConversation - Debug mode does not need
        false, // isNewConversation - Debug mode does not need
        () => {}, // setConversationTitle - Debug mode does not need
        async () => {}, // fetchConversationList - Debug mode does not need
        -1, // currentConversationId - Debug mode does not need
        conversationService
      );

      // Update final answer
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        setTestAnswer(lastMessage.finalAnswer || lastMessage.content || "");
      }
    } catch (error) {
      console.error("处理流式响应时出错:", error);
      const errorMessage = error instanceof Error ? error.message : "处理请求时发生错误";
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.content = errorMessage;
          lastMsg.isComplete = true;
          lastMsg.error = errorMessage;
        }
        return newMessages;
      });
      
      setTestAnswer(errorMessage);
    } finally {
      setIsStreaming(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  return (
    <div className="w-full h-full bg-white">
      <AgentDebugging 
        question={testQuestion} 
        answer={testAnswer} 
        onAskQuestion={handleTestQuestion}
        isStreaming={isStreaming}
        messages={messages}
        taskMessages={taskMessages}
        conversationGroups={conversationGroups}
      />
    </div>
  )
} 