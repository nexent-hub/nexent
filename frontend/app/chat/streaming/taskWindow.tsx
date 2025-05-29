import { useRef, useEffect, useState, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scrollArea"
import { ChatMessageType, TaskMessageType } from "@/types/chat"
import { MarkdownRenderer } from '@/components/ui/markdownRenderer'
import { Globe, Search, Zap, Bot, Code, FileText, HelpCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatTaskMessage } from "@/hooks/useChatTaskMessage"

// Icon mapping dictionary - map strings to corresponding icon components
const iconMap: Record<string, React.ReactNode> = {
  "search": <Search size={16} className="mr-2" color="#4b5563" />,
  "bot": <Bot size={16} className="mr-2" color="#4b5563" />,
  "code": <Code size={16} className="mr-2" color="#4b5563" />,
  "file": <FileText size={16} className="mr-2" color="#4b5563" />,
  "globe": <Globe size={16} className="mr-2" color="#4b5563" />,
  "zap": <Zap size={16} className="mr-2" color="#4b5563" />,
  "knowledge": <FileText size={16} className="mr-2" color="#4b5563" />,
  "default": <HelpCircle size={16} className="mr-2" color="#4b5563" /> // Default icon
};

// Define the type for card items
interface CardItem {
  icon?: string;
  text: string;
  [key: string]: any; // Allow other properties
}

// Define the interface for message handlers to improve extensibility
interface MessageHandler {
  canHandle: (message: any) => boolean;
  render: (message: any) => React.ReactNode;
}

// Define the handlers for different types of messages to improve extensibility
const messageHandlers: MessageHandler[] = [
  // Processing type processor - thinking, code generation, code execution
  {
    canHandle: (message) => 
      message.type === "agent_new_run" || 
      message.type === "generating_code" ||
      message.type === "executing",
    render: (message) => (
        <div style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          color: "#6b7280",
          fontWeight: 500,
          borderRadius: "0.25rem",
          paddingTop: "0.2rem"
        }}>
          <span>{message.content}</span>
        </div>
      )
  },
  
  // Add search_content_placeholder type processor - for history records
  {
    canHandle: (message) => message.type === "search_content_placeholder",
    render: (message) => {
      // Find search results in the message context
      const messageContainer = message._messageContainer;
      if (!messageContainer || !messageContainer.search || messageContainer.search.length === 0) {
        return null;
      }
      
      // Build the content for displaying search results
      const searchResults = messageContainer.search;
      
      // Process website information for display
      const siteInfos = searchResults.map((result: any) => {
        const pageUrl = result.url || "";
        const filename = result.filename || "";
        let domain = "未知来源";
        let displayName = "未知来源";
        let baseUrl = "";
        let faviconUrl = "";
        let useDefaultIcon = false;
        let isKnowledgeBase = false;
        
        // If there is a filename, it means it is local knowledge base content
        if (filename) {
          isKnowledgeBase = true;
          displayName = filename;
          useDefaultIcon = true;
        }
        // Otherwise, try to parse the URL
        else if (pageUrl) {
          try {
            const parsedUrl = new URL(pageUrl);
            baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
            domain = parsedUrl.hostname;
            
            // Process the domain, remove the www prefix and com/cn etc. suffix
            displayName = domain
              .replace(/^www\./, '') // Remove the www. prefix
              .replace(/\.(com|cn|org|net|io|gov|edu|co|info|biz|xyz)(\.[a-z]{2})?$/, ''); // Remove common suffixes
            
            // If the processing is empty, use the original domain
            if (!displayName) {
              displayName = domain;
            }
            
            faviconUrl = `${baseUrl}/favicon.ico`;
          } catch (e) {
            console.error("URL解析错误:", e);
            useDefaultIcon = true;
          }
        } else {
          useDefaultIcon = true;
        }
        
        return { 
          domain, 
          displayName, 
          faviconUrl, 
          url: pageUrl, 
          useDefaultIcon, 
          isKnowledgeBase,
          filename 
        };
      });
      
      // Render the search result information bar
      return (
        <div style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: "0.875rem",
          lineHeight: 1.5,
        }}>
          {/* Display multiple source websites in a single line */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "0.25rem"
          }}>
            {/* "正在阅读" label - a single line */}
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              fontWeight: 500,
              paddingTop: "0.15rem"
            }}>
              阅读检索结果
            </div>
            
            {/* Website icon and domain list - a new line */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              {siteInfos.map((site: any, index: number) => (
                <div 
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    color: "#4b5563",
                    border: "1px solid #e5e7eb",
                    cursor: site.url ? "pointer" : "default", /* Only show pointer style when there is a URL */
                    transition: site.url ? "background-color 0.2s" : "none" /* Only show hover effect when there is a URL */
                  }}
                  onClick={() => {
                    if (site.url) {
                      window.open(site.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (site.url) {
                      e.currentTarget.style.backgroundColor = "#f3f4f6"; /* Only show hover effect when there is a URL */
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (site.url) {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  title={site.url ? `访问 ${site.domain}` : site.filename} /* Display different prompts based on type */
                >
                  {site.isKnowledgeBase ? (
                    <FileText 
                      size={16} 
                      className="mr-2"
                      color="#6b7280"
                    />
                  ) : site.useDefaultIcon ? (
                    <Globe 
                      size={16} 
                      className="mr-2"
                      color="#6b7280"
                    />
                  ) : (
                    <img 
                      src={site.faviconUrl} 
                      alt={site.domain}
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "0.5rem",
                        borderRadius: "2px"
                      }}
                      onError={(e) => {
                        // If the icon fails to load, replace it with a React component
                        const imgElement = e.target as HTMLImageElement;
                        // Mark the element to prevent duplicate onError triggers
                        imgElement.style.display = 'none';
                        // Get the parent element
                        const parent = imgElement.parentElement;
                        if (parent) {
                          // Create a placeholder div, as the container of the Globe component
                          const placeholder = document.createElement('div');
                          placeholder.style.marginRight = '0.5rem';
                          placeholder.style.display = 'inline-flex';
                          placeholder.style.alignItems = 'center';
                          placeholder.style.justifyContent = 'center';
                          placeholder.style.width = '16px';
                          placeholder.style.height = '16px';
                          // Insert it before the img
                          parent.insertBefore(placeholder, imgElement);
                          // Render the Globe icon to this element (this can only be approximated using native methods)
                          placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                        }
                      }}
                    />
                  )}
                  <span>{site.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  },
  
  // card type processor - display cards with icons
  {
    canHandle: (message) => message.type === "card",
    render: (message) => {
      let cardItems: CardItem[] = [];
      
      try {
        // Parse the card content
        if (typeof message.content === 'string') {
          cardItems = JSON.parse(message.content);
        } else if (Array.isArray(message.content)) {
          cardItems = message.content;
        }
      } catch (error) {
        console.error("解析卡片内容失败:", error);
        return (
          <div style={{color: "red", padding: "8px"}}>
            无法解析卡片内容
          </div>
        );
      }
      
      if (!cardItems || cardItems.length === 0) {
        return null;
      }
      
      return (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginTop: "0.25rem"
        }}>
          {cardItems.map((card: CardItem, index: number) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.25rem 0.5rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.25rem",
                fontSize: "0.7rem",
                color: "#4b5563",
                border: "1px solid #e5e7eb",
                fontWeight: 500
              }}
            >
              {/* Get the corresponding icon component from the dictionary based on the icon name */}
              {card.icon && iconMap[card.icon] ? iconMap[card.icon] : iconMap["default"]}
              <span>{card.text}</span>
            </div>
          ))}
        </div>
      );
    }
  },
  
  // search_content type processor - search results
  {
    canHandle: (message) => {
      const isSearchContent = message.type === "search_content";
      return isSearchContent;
    },
    render: (message) => {
      
      // Extract search results from the content
      let searchResults = [];
      const content = message.content || "";
      
      try {
        // Try to parse the JSON content
        if (typeof content === 'string') {
          // Parse the JSON string
          const parsedContent = JSON.parse(content);
          
          // Check if it is an array
          if (Array.isArray(parsedContent)) {
            searchResults = parsedContent;
          } else {
            // If it is not an array but an object, it may be a single result
            searchResults = [parsedContent];
          }
        } else if (Array.isArray(content)) {
          // If it is already an array, use it directly
          searchResults = content;
        }
      } catch (error: any) {
        console.error("解析搜索结果失败:", error);
        return (
          <div style={{color: "red", padding: "8px"}}>
            无法解析搜索结果: {error.message}
          </div>
        );
      }
      
      // If there are no search results, display an empty message
      if (!searchResults || searchResults.length === 0) {
        return (
          <div style={{padding: "8px", color: "#6b7280"}}>
            未找到搜索结果
          </div>
        );
      }
      
      // Process website information for display
      const siteInfos = searchResults.map((result: any) => {
        const pageUrl = result.url || "";
        const filename = result.filename || "";
        let domain = "未知来源";
        let displayName = "未知来源";
        let baseUrl = "";
        let faviconUrl = "";
        let useDefaultIcon = false;
        let isKnowledgeBase = false;
        
        // If there is a filename, it means it is local knowledge base content
        if (filename) {
          isKnowledgeBase = true;
          displayName = filename;
          useDefaultIcon = true;
        }
        // Otherwise, try to parse the URL
        else if (pageUrl) {
          try {
            const parsedUrl = new URL(pageUrl);
            baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
            domain = parsedUrl.hostname;
            
            // Process the domain, remove the www prefix and com/cn etc. suffix
            displayName = domain
              .replace(/^www\./, '') // Remove the www. prefix
              .replace(/\.(com|cn|org|net|io|gov|edu|co|info|biz|xyz)(\.[a-z]{2})?$/, ''); // Remove common suffixes
            
            // If the processing is empty, use the original domain
            if (!displayName) {
              displayName = domain;
            }
            
            faviconUrl = `${baseUrl}/favicon.ico`;
          } catch (e) {
            console.error("URL解析错误:", e);
            useDefaultIcon = true;
          }
        } else {
          useDefaultIcon = true;
        }
        
        return { 
          domain, 
          displayName, 
          faviconUrl, 
          url: pageUrl, 
          useDefaultIcon, 
          isKnowledgeBase,
          filename 
        };
      });
      
      // Render the search result information bar
      return (
        <div style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: "0.875rem",
          lineHeight: 1.5,
        }}>
          {/* Display multiple source websites in a single line */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "0.25rem"
          }}>
            {/* "Reading search results" label - a single line */}
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              fontWeight: 500,
              paddingTop: "0.15rem"
            }}>
              阅读检索结果
            </div>
            
            {/* Website icon and domain list - a new line */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              {siteInfos.map((site: any, index: number) => (
                <div 
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    color: "#4b5563",
                    border: "1px solid #e5e7eb",
                    cursor: site.url ? "pointer" : "default", /* Only show pointer style when there is a URL */
                    transition: site.url ? "background-color 0.2s" : "none" /* Only show hover effect when there is a URL */
                  }}
                  onClick={() => {
                    if (site.url) {
                      window.open(site.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (site.url) {
                      e.currentTarget.style.backgroundColor = "#f3f4f6"; /* Only show hover effect when there is a URL */
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (site.url) {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  title={site.url ? `访问 ${site.domain}` : site.filename} /* Display different prompts based on type */
                >
                  {site.isKnowledgeBase ? (
                    <FileText 
                      size={16} 
                      className="mr-2"
                      color="#6b7280"
                    />
                  ) : site.useDefaultIcon ? (
                    <Globe 
                      size={16} 
                      className="mr-2"
                      color="#6b7280"
                    />
                  ) : (
                    <img 
                      src={site.faviconUrl} 
                      alt={site.domain}
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "0.5rem",
                        borderRadius: "2px"
                      }}
                      onError={(e) => {
                        // If the icon fails to load, replace it with a React component
                        const imgElement = e.target as HTMLImageElement;
                        // Mark the element to prevent duplicate onError triggers
                        imgElement.style.display = 'none';
                        // Get the parent element
                        const parent = imgElement.parentElement;
                        if (parent) {
                          // Create a placeholder div, as the container of the Globe component
                          const placeholder = document.createElement('div');
                          placeholder.style.marginRight = '0.5rem';
                          placeholder.style.display = 'inline-flex';
                          placeholder.style.alignItems = 'center';
                          placeholder.style.justifyContent = 'center';
                          placeholder.style.width = '16px';
                          placeholder.style.height = '16px';
                          // Insert it before the img
                          parent.insertBefore(placeholder, imgElement);
                          // Render the Globe icon to this element (this can only be approximated using native methods)
                          placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                        }
                      }}
                    />
                  )}
                  <span>{site.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  },
  
  // model_output type processor - model output
  {
    canHandle: (message) => message.type === "model_output",
    render: (message) => (
      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: "#1f2937",
        fontWeight: 400
      }}>
        <MarkdownRenderer content={message.content} className="task-message-content" />
      </div>
    )
  },
  
  // execution type processor - execution result (not displayed)
  {
    canHandle: (message) => message.type === "execution",
    render: (message) => null // Return null, do not render this type of message
  },
  
  // error type processor - error information
  {
    canHandle: (message) => message.type === "error",
    render: (message) => (
      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: "#dc2626",
        fontWeight: 500,
        borderRadius: "0.25rem",
        paddingTop: "0.2rem"
      }}>
        <span>{message.content}</span>
      </div>
    )
  },
  
  // virtual type processor - virtual message (do not display content, only as a card container)
  {
    canHandle: (message) => message.type === "virtual",
    render: () => null
  },

  // default processor - should be placed at the end
  {
    canHandle: () => true,
    render: (message) => {
      const content = message.content;
      if (typeof content === 'string') {
        return <MarkdownRenderer content={content} className="task-message-content" />;
      } else {
        return (
          <pre style={{
            whiteSpace: "pre-wrap", 
            fontSize: "0.75rem",
            fontFamily: "monospace"
          }}>
            {JSON.stringify(content, null, 2)}
          </pre>
        );
      }
    }
  }
];

interface TaskWindowProps {
  messages: TaskMessageType[]
  isStreaming?: boolean
}

export function TaskWindow({
  messages,
  isStreaming = false
}: TaskWindowProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isExpanded, setIsExpanded] = useState(isStreaming)
  
  const { hasMessages, hasVisibleMessages, groupedMessages } = useChatTaskMessage(messages as ChatMessageType[]);

  // The logic of automatically scrolling to the bottom
  useEffect(() => {
    if (autoScroll && isStreaming) {
      scrollToBottom();
    }
  }, [messages, autoScroll, isStreaming]);

  // Listen for message changes and automatically scroll to the bottom
  useEffect(() => {
    if (isExpanded) {
      const scrollAreaElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollAreaElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollAreaElement as HTMLElement;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      // If the user is already at the bottom or is streaming, automatically scroll
      if (distanceToBottom < 100 || isStreaming) {
        // Use requestAnimationFrame to avoid too frequent updates
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    }
  }, [messages.length, isExpanded, isStreaming]);

  // Handle the scrolling event of the scroll area
  useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!scrollAreaElement) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaElement as HTMLElement;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      // If the distance to the bottom is less than 20px, it is considered that the user has scrolled to the bottom, and enable automatic scrolling
      if (distanceToBottom < 20) {
        setAutoScroll(true);
      } else if (distanceToBottom > 30) { 
        // If the distance to the bottom is greater than 30px, and it is user-initiated scrolling, disable automatic scrolling
        setAutoScroll(false);
      }
    };
    
    scrollAreaElement.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollAreaElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // The logic of automatically folding when the message changes
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Check if the last message contains finalAnswer
      if (lastMessage.finalAnswer) {
        const timer = setTimeout(() => {
          setIsExpanded(false);
        }, 1000); // 1秒后折叠
        return () => clearTimeout(timer);
      }
    }
  }, [messages, isStreaming]);

  // The function of scrolling to the bottom
  const scrollToBottom = () => {
    const scrollAreaElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollAreaElement) return;
    
    // Use requestAnimationFrame to optimize performance
    requestAnimationFrame(() => {
      (scrollAreaElement as HTMLElement).scrollTop = (scrollAreaElement as HTMLElement).scrollHeight;
    });
  };

  // Use the processor to render the message content
  const renderMessageContent = (message: any) => {
    // Find the first processor that can handle this message type
    
    const handler = messageHandlers.find(h => h.canHandle(message));
    if (handler) {
      return handler.render(message);
    }
    
    // Fallback processing, normally not executed here
    console.warn("No processor found:", { 
      messageType: message.type 
    });
    return <div className="text-sm text-gray-500">未知消息类型: {message.type}</div>;
  };

  // Check if it is the last message
  const isLastMessage = (index: number, messages: any[]) => {
    return index === messages.length - 1;
  };

  // Check if a message should display a blinking dot
  const shouldBlinkDot = (message: any, index: number, messages: any[]) => {
    // As long as it is the last message and is streaming, it should blink, regardless of the message type
    return isStreaming && isLastMessage(index, messages);
  };

  // Render the message list
  const renderMessages = () => {
    if (!hasMessages) {
      return (
        <div className="text-center text-sm text-gray-400 mt-8">
          暂无任务消息
        </div>
      );
    }

    if (!hasVisibleMessages) {
      return (
        <div className="text-center text-sm text-gray-400 mt-8">
          暂无任务消息
        </div>
      );
    }

    return (
      <div className="relative pl-3">
        {groupedMessages.length > 1 && (
          <div className="absolute left-1.5 top-[0.65rem] bottom-[0.65rem] w-0.5 bg-gray-200"></div>
        )}

        {groupedMessages.map((group, groupIndex) => {
          const message = group.message;
          const isBlinking = shouldBlinkDot(message, groupIndex, groupedMessages.map(g => g.message));
          
          return (
            <div key={message.id || groupIndex} className="relative mb-5">
              {/* Dot - add blinking effect based on condition */}
              <div className="absolute left-[-9px] top-[0.55rem]">
                <div 
                  className={isBlinking ? "blinkingDot" : ""}
                  style={isBlinking ? {
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "9999px"
                  } : {
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "9999px",
                    backgroundColor: message.type === "virtual" ? "transparent" : "#9ca3af"
                  }}
                ></div>
              </div>
              
              {/* Message content */}
              <div className="ml-3 text-sm break-words">
                {renderMessageContent(message)}
                
                {/* Render card messages */}
                {group.cards.length > 0 && (
                  <div className="mt-2">
                    {group.cards.map((card, cardIndex) => (
                      <div key={`card-${cardIndex}`} className="ml-0">
                        {renderMessageContent(card)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {isExpanded ? (
        <div className="relative rounded-lg border border-gray-200 shadow-md h-[300px] mb-2 overflow-hidden">
          <div className="p-2 border-b border-gray-100/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">任务详情</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronRight className="h-4 w-4 rotate-90" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[252px] px-4" ref={scrollAreaRef}>
            {renderMessages()}
          </ScrollArea>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mb-2 w-full bg-white hover:bg-gray-50 border border-gray-200 shadow-sm"
          onClick={() => setIsExpanded(true)}
        >
          <ChevronRight className="h-4 w-4 mr-2 -rotate-90" />
          <span className="text-xs text-gray-500">展开任务执行详情</span>
        </Button>
      )}

      {/* Add necessary CSS animations */}
      <style jsx global>{`
        @keyframes blinkingDot {
          0% { background-color: rgba(59, 130, 246, 0.5); }
          50% { background-color: rgba(79, 70, 229, 1); }
          100% { background-color: rgba(59, 130, 246, 0.5); }
        }
        .blinkingDot {
          animation: blinkingDot 1.5s infinite ease-in-out;
          background-color: rgba(79, 70, 229, 1);
          box-shadow: 0 0 5px rgba(79, 70, 229, 0.5);
        }
      `}</style>
    </>
  )
} 