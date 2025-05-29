// Tool function for processing chat streaming response

import { ChatMessageType, AgentStep } from '@/types/chat';
 import {
   deduplicateImages,
   deduplicateSearchResults
 } from '../internal/chatHelpers';

interface JsonData {
  type: string;
  content: any;
}

// Processing Streaming Response Data
export const handleStreamResponse = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>,
  resetTimeout: () => void,
  stepIdCounter: React.MutableRefObject<number>,
  setIsSwitchedConversation: React.Dispatch<React.SetStateAction<boolean>>,
  isNewConversation: boolean,
  setConversationTitle: (title: string) => void,
  fetchConversationList: () => Promise<any>,
  currentConversationId: number,
  conversationService: any
) => {
  const decoder = new TextDecoder();
  let buffer = "";

  // Used to accumulate different types of content

  // Create an empty step object
  let currentStep: AgentStep = {
    id: ``,
    title: "",
    content: "",
    expanded: true,
    contents: [],
    metrics: "",
    thinking: { content: "", expanded: true },
    code: { content: "", expanded: true },
    output: { content: "", expanded: true }
  };

  let currentContentId = "";
  let lastContentType: "model_output" | "parsing" | "execution" | "agent_new_run" | "generating_code" | "search_content" | "card" | null = null;
  let currentContentText = "";
  let lastModelOutputIndex = -1;  // Track the index of the last model output in currentStep.contents
  let searchResultsContent: any[] = [];
  let allSearchResults: any[] = [];
  let finalAnswer = "";


  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data:")) {
          resetTimeout(); // Reset the timeout timer each time new data is received
          const jsonStr = line.substring(5).trim();

          try {
            // Parse the JSON data received each time
            const jsonData: JsonData = JSON.parse(jsonStr);

            if (jsonData.type && jsonData.content) {
              const messageType = jsonData.type;
              const messageContent = jsonData.content;


              // Process different types of messages
              switch (messageType) {
                case "step_count":
                  // Increment the counter for each new step
                  stepIdCounter.current += 1;

                  // Create a new step - use the counter and UUID combination to generate a unique ID
                  currentStep = {
                    id: `step-${stepIdCounter.current}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    title: messageContent.trim(),
                    content: "",
                    expanded: true,
                    contents: [], // Use an array to store all content in order
                    metrics: "",
                    thinking: { content: "", expanded: true },
                    code: { content: "", expanded: true },
                    output: { content: "", expanded: true }
                  };

                  // Reset status tracking variables
                  currentContentId = "";
                  currentContentText = "";
                  lastContentType = null;
                  lastModelOutputIndex = -1;
                  
                  break;
                  
                case "token_count":
                  // Process token counting logic
                  currentStep.metrics = messageContent;
                  break;
                  
                case "model_output_thinking":
                  // Process thinking content
                  if (currentStep) {
                    // Ensure contents exists
                    currentContentText = messageContent;

                    // If the last streaming output is thinking content, append
                    if (lastContentType === "model_output" && lastModelOutputIndex >= 0) {
                      const modelOutput = currentStep.contents[lastModelOutputIndex];
                      // Update content
                      const newContent = modelOutput.content + messageContent;
                      
                      // Check if the complete content starts with "Thinking:"
                      if (newContent.startsWith("思考：")) {
                        modelOutput.content = newContent.substring(3);
                      } else {
                        modelOutput.content = newContent;
                      }
                    } else {
                      // Otherwise, create new thinking content
                      currentStep.contents.push({
                        id: `model-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        type: "model_output",
                        subType: "thinking",
                        content: currentContentText,
                        expanded: true,
                        timestamp: Date.now()
                      });
                      lastModelOutputIndex = currentStep.contents.length - 1;
                    }
                    
                    // Update the last processed content type
                    lastContentType = "model_output";
                  }
                  break;

                case "card":
                  // Process card content
                  currentStep.contents.push({
                    id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    type: "card",
                    content: messageContent,
                    expanded: true,
                    timestamp: Date.now()
                  });
                  
                  // Update the last processed content type
                  lastContentType = "card";
                  break;
                  
                case "search_content":
                  try {
                    // Parse search result content
                    const searchResults = JSON.parse(messageContent);
                    if (Array.isArray(searchResults)) {
                      // Modify mapping to match the SearchResult type at the component level
                      const newSearchResults = searchResults.map(item => ({
                        title: item.title || "未知标题",
                        url: item.url || "#",
                        text: item.text || "无内容描述",
                        published_date: item.published_date || "",
                        tool_sign: item.tool_sign || "",
                        cite_index: typeof item.cite_index === 'number' ? item.cite_index : -1
                      }));

                      // Accumulate search results
                      searchResultsContent = [...searchResultsContent, ...newSearchResults];
                      allSearchResults = [...allSearchResults, ...newSearchResults];
                      
                      // Add to the current step's contents array
                      if (currentStep) {
                        // Add as a search_content type message
                        currentStep.contents.push({
                          id: `search-content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          type: "search_content",
                          content: messageContent, // Keep the original JSON string
                          expanded: true,
                          timestamp: Date.now()
                        });
                        
                        // Update the last processed content type
                        lastContentType = "search_content";
                      }
                    }
                    
                    // Update the search results of the current message
                    setMessages((prev) => {
                      const recordMessages = [...prev];
                      const lastMsg = recordMessages[recordMessages.length - 1];

                      if (!lastMsg.searchResults) {
                        lastMsg.searchResults = [];
                      }

                      // Use the public deduplication function to process search results
                      if (searchResultsContent && searchResultsContent.length > 0) {
                        lastMsg.searchResults = deduplicateSearchResults(
                          lastMsg.searchResults,
                          searchResultsContent
                        );
                      }

                      return recordMessages;
                    });
                  } catch(e) {
                    console.error("解析搜索内容失败:", e);
                  }
                  break;
                  
                case "picture_web":
                  try {
                    // Parse the image data structure
                    let imageUrls = JSON.parse(messageContent).images_url;

                    if (imageUrls.length > 0) {
                      // Update the images of the current message
                      setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];

                        // If there is no image array, initialize it
                        if (!lastMsg.images) {
                          lastMsg.images = [];
                        }

                        // Use the public deduplication function to process images
                        lastMsg.images = deduplicateImages(
                          lastMsg.images,
                          imageUrls
                        );


                        return newMessages;
                      });
                    }
                  } catch (error) {
                    console.error("处理图片数据失败:", error);
                  }
                  break;
                  
                case "final_answer":
                  // Accumulate final answer content
                  finalAnswer += messageContent;
                  break;
                  
                case "model_output_code":
                  // Process code generation - add a stable loading prompt
                  // Check if there is a code generation prompt
                  if (lastContentType === "generating_code") {
                    break;
                  }
                  
                  // If it does not exist, add one
                  const newGeneratingItem = {
                    id: `generating-code-${stepIdCounter.current}`,
                    type: "generating_code" as const,
                    content: "工具调用中...",
                    expanded: true,
                    timestamp: Date.now(),
                    isLoading: true,
                  };
                  
                  currentStep.contents.push(newGeneratingItem);
                  
                  // Mark as code generation type
                  lastContentType = "generating_code";
                  break;
                
                case "parse":
                  // Code display message, skip
                  break;
                
                case "tool":
                  // Only create a new execution prompt if the previous type is not executing
                  // This keeps the animation effect continuous
                  if (lastContentType === "execution") {
                    break;
                  }

                  // Add temporary content for executing code
                  currentStep.contents.push({
                    id: `executing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    type: "executing",
                    content: messageContent,
                    expanded: true,
                    timestamp: Date.now(),
                    isLoading: true
                  });

                  // Save the original parsing content, but do not display it in the frontend
                  currentStep.parsingContent = messageContent;

                  // Update the last processed content type
                  lastContentType = "execution";
                  break;
                
                case "execution_logs":
                  // Execution result message, skip
                  break;
                  
                case "agent_new_run":
                  // Add a "Thinking..." content
                  currentStep.contents.push({
                    id: `agent-run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    type: "agent_new_run",
                    content: "正在思考中...",
                    expanded: true,
                    timestamp: Date.now()
                  });
                  break;
                  
                case "error":
                  // Add error content to the current step's contents array
                  currentStep.contents.push({
                    id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    type: "error",
                    content: messageContent,
                    expanded: true,
                    timestamp: Date.now()
                  });
                  break;

                default:
                  // Process other types of messages
                  break;
              }

              // Update message content, display in real time
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];

                if (lastMsg && lastMsg.role === "assistant") {
                  // Update the current step
                  if (currentStep) {
                    if (!lastMsg.steps) lastMsg.steps = [];

                    // Find and update existing steps
                    const stepIndex = lastMsg.steps.findIndex(s => s.id === currentStep?.id);
                    if (stepIndex >= 0) {
                      lastMsg.steps[stepIndex] = JSON.parse(JSON.stringify(currentStep)); // Deep copy to ensure state update
                    } else {
                      // Only add new steps when there is content
                      if (currentStep.contents && currentStep.contents.length > 0) {
                        lastMsg.steps.push(JSON.parse(JSON.stringify(currentStep)));
                      }
                    }
                  }

                  // Update other special content
                  if (finalAnswer) lastMsg.finalAnswer = finalAnswer;
                }

                return newMessages;
              });
            }
          } catch (parseError) {
            console.warn("SSE 数据解析失败:", parseError);
          }
        }
      }
    }

    // Process the last line of buffer
    if (buffer.trim() && buffer.startsWith("data:")) {
      // Process the last line of data...
      resetTimeout(); // The last line of data also resets the timeout timer
      try {
        const jsonStr = buffer.substring(5).trim();
        const jsonData: JsonData = JSON.parse(jsonStr);

        if (jsonData.type && jsonData.content) {
          const messageType = jsonData.type;
          const messageContent = jsonData.content;

          // Process the last message, focusing on final_answer and card
          if (messageType === "final_answer") {
            finalAnswer += messageContent;
          }
        }
      } catch (error) {
        console.error("处理剩余数据失败:", error);
      }
    }

    // Mark message as complete, and check all steps again to prevent duplicates
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];

      if (lastMsg && lastMsg.role === "assistant") {
        lastMsg.isComplete = true;

        // Check and remove duplicate steps
        if (lastMsg.steps && lastMsg.steps.length > 0) {
          const uniqueSteps = [];
          const seenTitles = new Set();

          for (const step of lastMsg.steps) {
            // If it is an empty step or there is already a step with the same title, skip it
            if (
              !step.contents ||
              step.contents.length === 0 ||
              seenTitles.has(step.title.trim())
            ) {
              console.log("跳过重复或空步骤:", step.title);
              continue;
            }

            seenTitles.add(step.title.trim());
            uniqueSteps.push(step);
          }

          // Update to the deduplicated step list
          lastMsg.steps = uniqueSteps;
        }

        // If it is the first answer of a new conversation, generate a title
        if (isNewConversation && newMessages.length === 2) {
          // Use setTimeout to ensure the state has been updated
          setTimeout(async () => {
            try {
              // Prepare conversation history
              const history = newMessages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.role === 'assistant' ? (msg.finalAnswer || msg.content || '') : (msg.content || '')
              }));

              // Call the generate title interface
              const title = await conversationService.generateTitle({
                conversation_id: currentConversationId,
                history
              });
              // Update the title above the conversation
              if (title) {
                setConversationTitle(title);
              }
              // Update the list
              await fetchConversationList();
            } catch (error) {
              console.error("生成标题失败:", error);
            }
          }, 100); // Add a delay to ensure the state has been updated
        }
      }

      return newMessages;
    });

    // Reset the conversation switch status
    setIsSwitchedConversation(false);
    
  } catch (error) {
    console.error("处理流式响应时出错:", error);
    throw error; // Pass the error back to the original function for processing
  }
  
  return { finalAnswer };
}; 