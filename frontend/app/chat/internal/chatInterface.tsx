"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { useConfig } from "@/hooks/useConfig"
import { conversationService } from '@/services/conversationService';
import { storageService } from '@/services/storageService';

import { ChatSidebar } from "@/app/chat/layout/chatLeftSidebar"
import { FilePreview } from "@/app/chat/layout/chatInput"
import { ChatHeader } from "@/app/chat/layout/chatHeader"
import { ChatRightPanel } from "@/app/chat/layout/chatRightPanel"
import { ChatStreamMain } from "@/app/chat/streaming/chatStreamMain"

import {
  preprocessAttachments,
  handleFileUpload as preProcessHandleFileUpload,
  handleImageUpload as preProcessHandleImageUpload,
  uploadAttachments,
  createMessageAttachments,
  cleanupAttachmentUrls
} from "@/app/chat/internal/chatPreprocess"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { ConversationListItem, ApiConversationDetail } from '@/types/chat'
import { ChatMessageType, AgentStep } from '@/types/chat'
import { handleStreamResponse } from "@/app/chat/streaming/chatStreamHandler"
import { extractUserMsgFromResponse, extractAssistantMsgFromResponse } from "./extractMsgFromHistoryResponse"

import { X } from "lucide-react"

const stepIdCounter = {current: 0};

export function ChatInterface() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isSwitchedConversation, setIsSwitchedConversation] = useState(false) // Add conversation switching tracking state
  const [isLoading, setIsLoading] = useState(false)
  const initialized = useRef(false)
  const [appName, setAppName] = useState("新应用")
  const [conversationTitle, setConversationTitle] = useState("新对话")
  const [conversationId, setConversationId] = useState<number>(0)
  const [conversationList, setConversationList] = useState<ConversationListItem[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const { appConfig } = useConfig()

  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // Add attachment state management
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [fileUrls, setFileUrls] = useState<{[id: string]: string}>({});

  const [isStreaming, setIsStreaming] = useState(false) // Add streaming state
  const abortControllerRef = useRef<AbortController | null>(null) // Add AbortController reference
  const timeoutRef = useRef<NodeJS.Timeout | null>(null) // Add timeout reference

  // Add sidebar state control
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Add a new state for new conversation status
  const [isNewConversation, setIsNewConversation] = useState(true)

  // Ensure right sidebar is closed by default
  const [showRightPanel, setShowRightPanel] = useState(false)

  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>();

  // Add force scroll to bottom state control
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  // Reset scroll to bottom state
  useEffect(() => {
    if (shouldScrollToBottom) {
      // Give enough time for scrolling to complete, then reset state
      const timer = setTimeout(() => {
        setShouldScrollToBottom(false);
      }, 1200); // Slightly longer than the last scroll delay in ChatStreamMain
      
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToBottom]);

  // Add attachment cleanup function - cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      // Use preprocessing function to cleanup URLs
      cleanupAttachmentUrls(attachments, fileUrls);
    };
  }, [attachments, fileUrls]);

  // Handle file upload
  const handleFileUpload = (file: File) => {
    return preProcessHandleFileUpload(file, setFileUrls);
  };

  // Handle image upload
  const handleImageUpload = (file: File) => {
    preProcessHandleImageUpload(file);
  };
  
  // Add attachment management function
  const handleAttachmentsChange = (newAttachments: FilePreview[]) => {
    setAttachments(newAttachments);
  };

  // Define sidebar toggle function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Handle right panel toggle - keep it simple and clear
  const toggleRightPanel = () => {
    setShowRightPanel(!showRightPanel);
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true

      if (appConfig.appName) {
        setAppName(appConfig.appName)
      }

      // Get conversation history list, but don't auto-select the latest conversation
      fetchConversationList()
        .then((dialogData) => {
          // Create new conversation by default regardless of history
          handleNewConversation()
        })
        .catch((err) => {
          console.error("初始化时获取对话列表失败:", err)
          // Create new conversation even if getting conversation list fails
          handleNewConversation()
        })
    }
  }, [appConfig]) // Add appConfig as dependency

  // Add useEffect to listen for conversationId changes, ensure right sidebar is always closed when conversation switches
  useEffect(() => {
    // Ensure right sidebar is reset to closed state whenever conversation ID changes
    setSelectedMessageId(undefined);
    setShowRightPanel(false);
  }, [conversationId]);

  // Clear all timers and requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort('组件卸载');
        } catch (error) {
          console.log('取消请求时出错', error);
        }
        abortControllerRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

   const handleSend = async () => {
    if ((!input.trim()) && attachments.length === 0) return // Allow sending attachments only, without text content

    // If in new conversation state, switch to conversation state after sending message
    if (isNewConversation) {
      setIsNewConversation(false);
    }

    // Ensure right sidebar doesn't auto-expand when sending new message
    setSelectedMessageId(undefined)
    setShowRightPanel(false)

    // Handle user message content
    const userMessageId = uuidv4();
    const userMessageContent = input.trim();
    
    // Prepare attachment information
    // Handle file upload
    let uploadedFileUrls: Record<string, string> = {};
    let objectNames: Record<string, string> = {}; // Add object name mapping
    let uploadError: string | undefined;
    
    if (attachments.length > 0) {
      // Show loading state
      setIsLoading(true);
      
      // Use preprocessing function to upload attachments
      const uploadResult = await uploadAttachments(attachments);
      uploadedFileUrls = uploadResult.uploadedFileUrls;
      objectNames = uploadResult.objectNames; // Get object name mapping
      uploadError = uploadResult.error;
    }

    // Use preprocessing function to create message attachments
    const messageAttachments = createMessageAttachments(attachments, uploadedFileUrls, fileUrls);

    // Create user message object
    const userMessage: ChatMessageType = {
      id: userMessageId,
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined
    };

    // Add user message to chat history first
    setMessages(prevMessages => [...prevMessages, userMessage])

    // Clear input box and attachments
    setInput("")
    setAttachments([])

    // Create initial AI reply message
    const assistantMessageId = uuidv4()
    const initialAssistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isComplete: false,
      steps: []
    }

    // Add initial AI reply message (will show loading state)
    setMessages(prevMessages => [...prevMessages, initialAssistantMessage])

    // 发送消息后自动滚动到底部
    setShouldScrollToBottom(true);

    setIsLoading(true)
    setIsStreaming(true) // Set streaming state to true

    // Create new AbortController
    abortControllerRef.current = new AbortController()

    // Set timeout timer - 120 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(async () => {
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          try {
            // Stop agent_run immediately
            abortControllerRef.current.abort('请求超时');
            console.log('请求超过120秒已自动取消');
            
            // Update frontend state immediately
            setIsLoading(false);
            setIsStreaming(false);
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                lastMsg.error = "Request timeout, please retry";
                lastMsg.isComplete = true;
                lastMsg.thinking = undefined; // Explicitly clear thinking state
              }
              return newMessages;
            });

            // Use backend API to stop conversation
            if (conversationId && conversationId !== -1) {
              try {
                await conversationService.stop(conversationId);
              } catch (error) {
                console.error('停止超时请求失败:', error);
              }
            }
          } catch (error) {
            console.log('取消请求时出错', error);
          }
        }
        timeoutRef.current = null;
      }, 120000); // 120 second timeout
    }

    resetTimeout(); // Initialize timeout timer

    try {
      // Check if need to create new conversation
      let currentConversationId = conversationId;
      if (!currentConversationId || currentConversationId === -1) {
        // If no session ID or ID is -1, create new conversation first
        try {
          const createData = await conversationService.create();
          currentConversationId = createData.conversation_id;

          // Update current session state
          setConversationId(currentConversationId);
          setSelectedConversationId(currentConversationId);
          setConversationTitle(createData.conversation_title || "新对话");

          // Refresh conversation list
          try {
            const dialogList = await fetchConversationList();
            const newDialog = dialogList.find(dialog => dialog.conversation_id === currentConversationId);
            if (newDialog) {
              setSelectedConversationId(currentConversationId);
            }
          } catch (error) {
            console.error("刷新对话列表失败，但继续发送消息:", error);
          }
        } catch (error) {
          console.error("创建新对话失败，但仍会尝试发送消息:", error);
        }
      }

      // If there are attachment files, preprocess first
      let finalQuery = userMessage.content;
      let currentStep: AgentStep | null = null;
      // Declare a variable to save file description information
      let fileDescriptionsMap: Record<string, string> = {};

      if (attachments.length > 0) {
        // Attachment preprocessing step, as independent step in assistant steps
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            if (!lastMsg.steps) lastMsg.steps = [];
            let step = lastMsg.steps.find(s => s.title === '文件预处理');
            if (!step) {
              step = {
                id: `preprocess-${Date.now()}`,
                title: '文件预处理',
                content: '',
                expanded: true,
                metrics: '',
                thinking: { content: '', expanded: false },
                code: { content: '', expanded: false },
                output: { content: '', expanded: false },
                contents: [{
                  id: `preprocess-content-${Date.now()}`,
                  type: 'agent_new_run',
                  content: '正在解析文件…',
                  expanded: false,
                  timestamp: Date.now()
                }]
              };
              lastMsg.steps.push(step);
            } else if (step.contents && step.contents.length > 0) {
              // If already exists, reset content to initial prompt
              step.contents[0].content = '正在解析文件…';
              step.contents[0].timestamp = Date.now();
            }
          }
          return newMessages;
        });

        // Use extracted preprocessing function to process attachments
        const result = await preprocessAttachments(
          userMessage.content,
          attachments,
          abortControllerRef.current.signal,
          (jsonData) => {
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                if (!lastMsg.steps) lastMsg.steps = [];
                // Find the latest preprocessing step
                let step = lastMsg.steps.find(s => s.title === '文件预处理');
                if (!step) {
                  step = {
                    id: `preprocess-${Date.now()}`,
                    title: '文件预处理',
                    content: '',
                    expanded: true,
                    metrics: '',
                    thinking: { content: '', expanded: false },
                    code: { content: '', expanded: false },
                    output: { content: '', expanded: false },
                    contents: [{
                      id: `preprocess-content-${Date.now()}`,
                      type: 'agent_new_run',
                      content: '正在解析文件…',
                      expanded: false,
                      timestamp: Date.now()
                    }]
                  };
                  lastMsg.steps.push(step);
                }
                let stepContent = '';
                switch (jsonData.type) {
                  case "progress":
                    stepContent = jsonData.message;
                    break;
                  case "error":
                    stepContent = `解析文件 ${jsonData.filename} 失败: ${jsonData.message}`;
                    break;
                  case "file_processed":
                    stepContent = `文件 ${jsonData.filename} 已解析完成`;
                    break;
                  case "complete":
                    stepContent = "文件解析完成";
                    break;
                  default:
                    stepContent = jsonData.message || '';
                }
                // Only update the first content, don't add new ones
                if (step && step.contents && step.contents.length > 0) {
                  step.contents[0].content = stepContent;
                  step.contents[0].timestamp = Date.now();
                }
              }
              return newMessages;
            });
          }
        );

        // Handle preprocessing result
        if (!result.success) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.error = `文件处理失败: ${result.error}`;
              lastMsg.isComplete = true;
            }
            return newMessages;
          });
          return;
        }

        finalQuery = result.finalQuery;
        fileDescriptionsMap = result.fileDescriptions || {};
      }

      // Send request to backend API, add signal parameter
      const reader = await conversationService.runAgent({
        query: finalQuery, // Use preprocessed query or original query
        conversation_id: currentConversationId,
        is_set: isSwitchedConversation || messages.length <= 1,
        history: messages.filter(msg => msg.id !== userMessage.id).map(msg => ({
          role: msg.role,
          content: msg.role === "assistant"
            ? (msg.finalAnswer?.trim() || msg.content || "")
            : (msg.content || "")
        })),
        minio_files: messageAttachments.length > 0 ? messageAttachments.map(attachment => {
          // Get file description
          let description = "";
          if (attachment.name in fileDescriptionsMap) {
            description = fileDescriptionsMap[attachment.name];
          }
          
          return {
            object_name: objectNames[attachment.name] || '',
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            url: uploadedFileUrls[attachment.name] || attachment.url,
            description: description
          };
        }) : undefined // Use complete attachment object structure
      }, abortControllerRef.current.signal);

      if (!reader) throw new Error("Response body is null")

      // Call streaming processing function to handle response
      await handleStreamResponse(
        reader,
        setMessages,
        resetTimeout,
        stepIdCounter,
        setIsSwitchedConversation,
        isNewConversation,
        setConversationTitle,
        fetchConversationList,
        currentConversationId,
        conversationService,
        false // isDebug: false for normal chat mode
      );

      // Reset all related states
      setIsLoading(false);
      setIsStreaming(false);
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Note: Save operation is already implemented in agent run API, no need to save again in frontend
    } catch (error) {
      // If user actively canceled, don't show error message
      const err = error as Error;
      if (err.name === 'AbortError') {
        console.log('用户取消了请求');
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content = "对话已停止";
            lastMsg.isComplete = true;
            lastMsg.thinking = undefined; // Explicitly clear thinking state
          }
          return newMessages;
        });
      } else {
        console.error("Error:", error)
        const errorMessage = error instanceof Error ? error.message : "处理请求时发生错误"
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content = errorMessage;
            lastMsg.isComplete = true;
            lastMsg.error = errorMessage;
            lastMsg.thinking = undefined; // Explicitly clear thinking state
          }
          return newMessages;
        });
      }

      setIsLoading(false);
      setIsStreaming(false);
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = async () => {
    // Cancel current ongoing request first
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort('切换到新对话');
      } catch (error) {
        console.log('取消请求时出错', error);
      }
      abortControllerRef.current = null;
    }

    // Clear timeout timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If currently in conversation, stop current conversation
    if (isStreaming && conversationId && conversationId !== -1) {
      try {
        console.log('创建新对话前停止当前对话:', conversationId);
        await conversationService.stop(conversationId);
      } catch (error) {
        console.error('停止当前对话失败:', error);
        // Continue creating new conversation even if stopping fails
      }
    }

    // Reset all states
    setInput("");
    setIsLoading(false);
    setConversationId(-1);
    setIsSwitchedConversation(false);
    setConversationTitle("新对话");
    setSelectedConversationId(null);
    setIsNewConversation(true); // Ensure set to new conversation state

    // Reset messages and steps
    setMessages([]);

    // Reset streaming state
    setIsStreaming(false);

    // Reset selected message and right panel state
    setSelectedMessageId(undefined);
    setShowRightPanel(false);

    // Reset attachment state
    setAttachments([]);
    setFileUrls({});

    // Clear URL parameters
    const url = new URL(window.location.href);
    if (url.searchParams.has("q")) {
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }

    // Wait for all state updates to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // 确保新对话时滚动到底部
    setShouldScrollToBottom(true);
  }

  const fetchConversationList = async () => {
    try {
      const dialogHistory = await conversationService.getList();
      // Sort by creation time, newest first
      dialogHistory.sort((a, b) => b.create_time - a.create_time);
      setConversationList(dialogHistory);
      return dialogHistory;
    } catch (error) {
      console.error("获取对话列表出错:", error);
      throw error;
    }
  };

  // When user clicks left sidebar component, switch to corresponding conversation, trigger function, load conversation history
  const handleDialogClick = async (dialog: ConversationListItem) => {
    // Cancel current ongoing request first
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort('切换对话');
      } catch (error) {
        console.log('取消请求时出错', error);
      }
      abortControllerRef.current = null;
    }

    // Clear timeout timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If currently in conversation, stop current conversation first
    if (isStreaming && conversationId && conversationId !== -1) {
      try {
        console.log('切换对话前停止当前对话:', conversationId);
        await conversationService.stop(conversationId);
        setIsStreaming(false);
        setIsLoading(false);
      } catch (error) {
        console.error('停止当前对话失败:', error);
        // Continue switching conversation even if stopping fails
        setIsStreaming(false);
        setIsLoading(false);
      }
    }

    // Set states
    setConversationId(dialog.conversation_id)
    setConversationTitle(dialog.conversation_title)
    setSelectedConversationId(dialog.conversation_id)
    setIsSwitchedConversation(true)

    // Reset selected message ID, ensure right panel state is correct
    setSelectedMessageId(undefined)
    // Ensure right panel is closed by default
    setShowRightPanel(false)

    try {
      // Create new AbortController for current request
      const controller = new AbortController();

      // Set timeout timer - 120 seconds
      timeoutRef.current = setTimeout(() => {
        if (controller && !controller.signal.aborted) {
          try {
            controller.abort('请求超时');
            console.log('请求超过120秒已自动取消');
          } catch (error) {
            console.error('取消请求时出错', error);
          }
        }
        timeoutRef.current = null;
      }, 120000);

      // Save current controller reference
      abortControllerRef.current = controller;

      // Use controller.signal to make request with timeout
      const data = await conversationService.getDetail(dialog.conversation_id, controller.signal);

      // Clear timeout timer after request completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Don't process result if request was canceled
      if (controller.signal.aborted) {
        return;
      }

      if (data.code === 0 && data.data && data.data.length > 0) {
        const conversationData = data.data[0] as ApiConversationDetail;
        const dialogMessages = conversationData.message || [];

        setTimeout(() => {
          const formattedMessages: ChatMessageType[] = [];

          // Optimized processing logic: process messages by role one by one, maintain original order
          dialogMessages.forEach((dialog_msg, index) => {
            if (dialog_msg.role === "user") {
              const formattedUserMsg: ChatMessageType = extractUserMsgFromResponse(dialog_msg, index, conversationData.create_time)
              formattedMessages.push(formattedUserMsg);
            } else if (dialog_msg.role === "assistant") {
              const formattedAssistantMsg: ChatMessageType = extractAssistantMsgFromResponse(dialog_msg, index, conversationData.create_time)
              formattedMessages.push(formattedAssistantMsg);
            }
          });

          // Update message array
          setMessages(formattedMessages);

          // Asynchronously load all attachment URLs
          loadAttachmentUrls(formattedMessages);

          // Trigger scroll to bottom
          setShouldScrollToBottom(true);

          // Refresh history list
          fetchConversationList().catch(err => {
            console.error("刷新对话列表失败:", err);
          });
        }, 0);
      } else {
        console.error("获取对话详情失败:", data.message)
      }
    } catch (error) {
      console.error("获取对话详情错误:", error)
    }
  }

  // Add function to asynchronously load attachment URLs
  const loadAttachmentUrls = async (messages: ChatMessageType[]) => {
    // Create a copy to avoid directly modifying parameters
    const updatedMessages = [...messages];
    let hasUpdates = false;

    // Process attachments for each message
    for (const message of updatedMessages) {
      if (message.attachments && message.attachments.length > 0) {
        // Get URL for each attachment
        for (const attachment of message.attachments) {
          if (attachment.object_name && !attachment.url) {
            try {
              // Get file URL
              const url = await storageService.getFileUrl(attachment.object_name);
              // Update attachment info
              attachment.url = url;
              hasUpdates = true;
            } catch (error) {
              console.error(`获取附件URL失败: ${attachment.object_name}`, error);
            }
          }
        }
      }
    }

    // If there are updates, set new message array
    if (hasUpdates) {
      setMessages(updatedMessages);
    }
  };

  // Left sidebar conversation title update
  const handleConversationRename = async (dialogId: number, title: string) => {
    try {
      await conversationService.rename(dialogId, title);
      await fetchConversationList();

      if (selectedConversationId === dialogId) {
        setConversationTitle(title);
      }
    } catch (error) {
      console.error("重命名失败:", error);
    }
  };

  // Left sidebar conversation deletion
  const handleConversationDeleteClick = async (dialogId: number) => {
    try {
      // If deleting the currently active conversation, stop conversation first
      if (selectedConversationId === dialogId && isStreaming && conversationId === dialogId) {
        // Cancel current ongoing request first
        if (abortControllerRef.current) {
          try {
            abortControllerRef.current.abort('删除对话');
          } catch (error) {
            console.log('取消请求时出错', error);
          }
          abortControllerRef.current = null;
        }

        // Clear timeout timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setIsStreaming(false);
        setIsLoading(false);

        try {
          console.log('删除对话前停止当前对话:', dialogId);
          await conversationService.stop(dialogId);
        } catch (error) {
          console.error('停止要删除的对话失败:', error);
          // Continue deleting even if stopping fails
        }
      }

      await conversationService.delete(dialogId);
      await fetchConversationList();

      if (selectedConversationId === dialogId) {
        setSelectedConversationId(null);
        setConversationTitle("新对话");
        handleNewConversation();
      }
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  // Add image error handling function
  const handleImageError = (imageUrl: string) => {
    console.error("图片加载失败:", imageUrl);

    // Remove failed images from messages
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];

      if (lastMsg && lastMsg.role === "assistant" && lastMsg.images) {
        // Filter out failed images
        lastMsg.images = lastMsg.images.filter(url => url !== imageUrl);
      }

      return newMessages;
    });
  };

  // Handle image click preview
  const handleImageClick = (imageUrl: string) => {
    setViewingImage(imageUrl);
  };

  // Add conversation stop handling function
  const handleStop = async () => {
    // stop agent_run immediately
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort('用户手动停止');
      } catch (error) {
        console.log('取消请求时出错', error);
      }
      abortControllerRef.current = null;
    }

    // Clear timeout timer (if still in use)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Immediately update frontend state
    setIsStreaming(false);
    setIsLoading(false);

    // If no valid conversation ID, just reset frontend state
    if (!conversationId || conversationId === -1) {
      return;
    }

    try {
      // Call backend stop API
      await conversationService.stop(conversationId);
      
      // Manually update messages, clear thinking state
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.isComplete = true;
          lastMsg.thinking = undefined; // Explicitly clear thinking state
        }
        return newMessages;
      });
    } catch (error) {
      console.error('停止对话失败:', error);
      
      // Optionally show error message
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.isComplete = true;
          lastMsg.thinking = undefined; // Explicitly clear thinking state
          lastMsg.error = "停止对话失败，但前端已停止显示";
        }
        return newMessages;
      });
    }
  };

  // Top title rename function
  const handleTitleRename = async (newTitle: string) => {
    if (selectedConversationId && newTitle !== conversationTitle) {
      try {
        await conversationService.rename(selectedConversationId, newTitle);
        await fetchConversationList();
        setConversationTitle(newTitle);
      } catch (error) {
        console.error("重命名失败:", error);
      }
    }
  };

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    if (messageId !== selectedMessageId) {
      // If clicking on new message, set as selected and open right panel
      setSelectedMessageId(messageId);
      // Auto open right panel
      setShowRightPanel(true);
    } else {
      // If clicking on already selected message, toggle panel state
      toggleRightPanel();
    }
  };

  // Like/dislike handling
  const handleOpinionChange = async (messageId: number, opinion: 'Y' | 'N' | null) => {
    try {
      await conversationService.updateOpinion({ message_id: messageId, opinion });
      setMessages((prev) => prev.map(msg =>
        msg.message_id === messageId ? { ...msg, opinion_flag: opinion as string | undefined } : msg
      ));
    } catch (error) {
      console.error('更新点赞/点踩失败:', error);
    }
  };

  return (
    <>
      <div className="flex h-screen">
        <ChatSidebar
          conversationList={conversationList}
          selectedConversationId={selectedConversationId}
          openDropdownId={openDropdownId}
          onNewConversation={handleNewConversation}
          onDialogClick={handleDialogClick}
          onRename={handleConversationRename}
          onDelete={handleConversationDeleteClick}
          onSettingsClick={() => {
            localStorage.setItem('show_page', '1');
            router.push("/setup");
          }}
          onDropdownOpenChange={(open, id) => setOpenDropdownId(open ? id : null)}
          onToggleSidebar={toggleSidebar}
          expanded={sidebarOpen}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col">
              <ChatHeader
                title={conversationTitle}
                onShare={() => {
                  console.log("Share clicked")
                }}
                onRename={handleTitleRename}
              />

              <ChatStreamMain
                messages={messages}
                input={input}
                isLoading={isLoading}
                isStreaming={isStreaming}
                onInputChange={(value) => setInput(value)}
                onSend={handleSend}
                onStop={handleStop}
                onKeyDown={handleKeyDown}
                onSelectMessage={handleMessageSelect}
                selectedMessageId={selectedMessageId}
                onImageClick={handleImageClick}
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                onFileUpload={handleFileUpload}
                onImageUpload={handleImageUpload}
                onOpinionChange={handleOpinionChange}
                currentConversationId={conversationId}
                shouldScrollToBottom={shouldScrollToBottom}
              />

              {/* Footer */}
              <div className="flex-shrink-0 mt-auto">
                <div className="text-center text-sm py-1" style={{ color: 'rgb(163, 163, 163)', position: 'sticky', bottom: 0, backgroundColor: 'white', width: '100%' }}>
                  内容由 AI 生成，请仔细甄别
                </div>
              </div>
            </div>

            <ChatRightPanel
              messages={messages}
              onImageError={handleImageError}
              maxInitialImages={14}
              isVisible={showRightPanel}
              toggleRightPanel={toggleRightPanel}
              selectedMessageId={selectedMessageId}
            />
          </div>
        </div>
      </div>
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger asChild>
            <div className="fixed inset-0 pointer-events-none" />
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
            停止生成
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Image preview */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-[90%] max-h-[90%]" onClick={e => e.stopPropagation()}>
            <img
              src={viewingImage}
              alt="图片预览"
              className="max-w-full max-h-[90vh] object-contain"
              onError={() => {
                handleImageError(viewingImage);
              }}
            />
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-4 -right-4 bg-white p-1 rounded-full shadow-md hover:bg-white transition-colors"
            >
              <X size={16} className="text-gray-600 hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
