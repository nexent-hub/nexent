import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// @ts-ignore
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SearchResult } from '@/types/chat'
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import 'github-markdown-css/github-markdown.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  searchResults?: SearchResult[]
}

// Get background color for different tool signs
const getBackgroundColor = (toolSign: string) => {
  switch (toolSign) {
    case 'a': return '#E3F2FD'; // 浅蓝色
    case 'b': return '#E8F5E9'; // 浅绿色
    case 'c': return '#FFF3E0'; // 浅橙色
    case 'd': return '#F3E5F5'; // 浅紫色
    case 'e': return '#FFEBEE'; // 浅红色
    default: return '#E5E5E5'; // 默认浅灰色
  }
}

// Replace the original LinkIcon component
const CitationBadge = ({ toolSign, citeIndex }: { toolSign: string, citeIndex: number }) => (
  <span
    className="ds-markdown-cite"
    style={{
      verticalAlign: 'middle',
      fontVariant: 'tabular-nums',
      boxSizing: 'border-box',
      color: '#404040',
      cursor: 'pointer',
      background: getBackgroundColor(toolSign),
      borderRadius: '9px',
      flexShrink: 0,
      justifyContent: 'center',
      alignItems: 'center',
      height: '18px',
      marginLeft: '4px',
      padding: '0 6px',
      fontSize: '12px',
      fontWeight: 400,
      display: 'inline-flex',
      position: 'relative',
      top: '-2px'
    }}
  >
    {citeIndex}
  </span>
);

// Modified HoverableText component
const HoverableText = ({ text, searchResults }: { 
  text: string;
  searchResults?: SearchResult[]
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const mousePositionRef = React.useRef({ x: 0, y: 0 });

  // Function to handle multiple consecutive line breaks
  const handleConsecutiveNewlines = (text: string) => {
    if (!text) return text;
    return text
      // First, standardize all types of line breaks to \n
      .replace(/\r\n/g, '\n')  // Windows line breaks
      .replace(/\r/g, '\n')    // Old Mac line breaks
      // Handle consecutive line breaks and whitespace
      .replace(/[\n\s]*\n[\n\s]*/g, '\n')  // Process whitespace around line breaks
      .replace(/^\s+|\s+$/g, '');  // Remove leading and trailing whitespace
  };

  // Find corresponding search result - simplified for numeric-only format
  const toolSign = text.charAt(0);
  const citeIndex = parseInt(text.slice(1))
  const matchedResult = searchResults?.find(
    result => result.tool_sign === toolSign && result.cite_index === citeIndex
  );

  // Handle mouse events
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let closeTimeoutId: NodeJS.Timeout | null = null;

    // 更新鼠标位置的处理函数
    const updateMousePosition = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseEnter = () => {
      // 清除可能存在的关闭定时器
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
        closeTimeoutId = null;
      }
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Delay before showing tooltip to avoid quick hover triggers
      timeoutId = setTimeout(() => {
        setIsOpen(true);
      }, 50);
    };

    const handleMouseLeave = () => {
      // Clear open timer
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Delay closing tooltip so user can move to tooltip content
      closeTimeoutId = setTimeout(() => {
        checkShouldClose();
      }, 100);
    };
    
    // Function to check if tooltip should be closed
    const checkShouldClose = () => {
      const tooltipContent = document.querySelector(".z-\\[9999\\]");
      const linkElement = containerRef.current;
      
      if (!tooltipContent || !linkElement) {
        setIsOpen(false);
        return;
      }
      
      const tooltipRect = tooltipContent.getBoundingClientRect();
      const linkRect = linkElement.getBoundingClientRect();
      const { x: mouseX, y: mouseY } = mousePositionRef.current;
      
      // Check if mouse is over tooltip or link icon
      const isMouseOverTooltip = 
        mouseX >= tooltipRect.left && 
        mouseX <= tooltipRect.right && 
        mouseY >= tooltipRect.top && 
        mouseY <= tooltipRect.bottom;
        
      const isMouseOverLink = 
        mouseX >= linkRect.left && 
        mouseX <= linkRect.right && 
        mouseY >= linkRect.top && 
        mouseY <= linkRect.bottom;
        
      // Close tooltip if mouse is neither over tooltip nor link icon
      if (!isMouseOverTooltip && !isMouseOverLink) {
        setIsOpen(false);
      }
    };
    
    // Add global mouse move event listener to handle movement anywhere
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Update mouse position
      updateMousePosition(e);
      
      if (!isOpen) return;
      
      // Use debounce logic to avoid frequent calculations
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
      }
      
      closeTimeoutId = setTimeout(() => {
        checkShouldClose();
      }, 100);
    };

    // Add event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
      }
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOpen]);

  return (
    <TooltipProvider>
      <Tooltip open={isOpen}>
        <div
          ref={containerRef}
          className="inline-flex items-center relative"
          style={{ zIndex: isOpen ? 1000 : 'auto' }}
        >
          <TooltipTrigger asChild>
            <span className="inline-flex items-center cursor-pointer transition-colors">
                <CitationBadge toolSign={toolSign} citeIndex={citeIndex} />
            </span>
          </TooltipTrigger>
          {/* Force Portal to body */}
          <TooltipPrimitive.Portal>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={5}
              className="z-[9999] bg-white px-3 py-2 text-sm border shadow-md max-w-md"
              style={{
                '--scrollbar-width': '8px',
                '--scrollbar-height': '8px',
                '--scrollbar-track-bg': 'transparent',
                '--scrollbar-thumb-bg': 'rgb(209, 213, 219)',
                '--scrollbar-thumb-hover-bg': 'rgb(156, 163, 175)',
                '--scrollbar-thumb-radius': '9999px'
              } as React.CSSProperties}
            >
              <div
                ref={tooltipRef}
                className="whitespace-pre-wrap overflow-y-auto"
                style={{
                  maxHeight: 240,
                  minWidth: 200,
                  maxWidth: 400,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--scrollbar-thumb-bg) var(--scrollbar-track-bg)'
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: var(--scrollbar-width);
                    height: var(--scrollbar-height);
                  }
                  div::-webkit-scrollbar-track {
                    background: var(--scrollbar-track-bg);
                  }
                  div::-webkit-scrollbar-thumb {
                    background: var(--scrollbar-thumb-bg);
                    border-radius: var(--scrollbar-thumb-radius);
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: var(--scrollbar-thumb-hover-bg);
                  }
                  @media (prefers-color-scheme: dark) {
                    div::-webkit-scrollbar-thumb {
                      background: rgb(55, 65, 81);
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: rgb(75, 85, 99);
                    }
                  }
                `}</style>
                {matchedResult ? (
                  <>
                    {matchedResult.url && matchedResult.url !== "#" ? (
                      <a
                        href={matchedResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium mb-1 text-blue-600 hover:underline block"
                        style={{ wordBreak: 'break-all' }}
                      >
                        {handleConsecutiveNewlines(matchedResult.title)}
                      </a>
                    ) : (
                      <p className="font-medium mb-1">{handleConsecutiveNewlines(matchedResult.title)}</p>
                    )}
                    <p className="text-gray-600">{handleConsecutiveNewlines(matchedResult.text)}</p>
                  </>
                ) : null}
              </div>
            </TooltipContent>
          </TooltipPrimitive.Portal>
        </div>
      </Tooltip>
    </TooltipProvider>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className,
  searchResults = [] 
}) => {
  // Customize code block style with light gray background
  const customStyle = {
    ...oneLight,
    'pre[class*="language-"]': {
      ...oneLight['pre[class*="language-"]'],
      background: '#f5f5f5', // Light gray background
      borderRadius: '4px',
      padding: '8px 12px',
      margin: '4px 0',
      fontSize: '0.875rem', // Slightly smaller font size for better fit
      lineHeight: '1.5', // Adjusted line height
      whiteSpace: 'pre-wrap', // Allow wrapping of long lines
      wordWrap: 'break-word', // Break long words
      wordBreak: 'break-word', // Break long words
      overflowWrap: 'break-word', // Break long words
      overflow: 'auto', // Add scroll for extremely long content
      maxWidth: '100%', // Ensure it doesn't exceed container width
      boxSizing: 'border-box' // Include padding in width calculation
    },
    'code[class*="language-"]': {
      ...oneLight['code[class*="language-"]'],
      background: '#f5f5f5', // Light gray background
      color: '#333333', // Dark gray text for better readability
      fontSize: '0.875rem', // Slightly smaller font size for better fit
      lineHeight: '1.5', // Adjusted line height
      whiteSpace: 'pre-wrap', // Allow wrapping of long lines
      wordWrap: 'break-word', // Break long words
      wordBreak: 'break-word', // Break long words
      overflowWrap: 'break-word', // Break long words
      maxWidth: '100%', // Ensure it doesn't exceed container width
      padding: '0' // 移除code元素的内部padding
    }
  };

  // Check if this is user message content
  const isUserMessage = className?.includes('user-message-content');

  // Modified processText function logic
  const processText = (text: string) => {
    if (typeof text !== 'string') return text;
    
    const parts = text.split(/(\[\[[^\]]+\]\])/g);
    return (
      <>
        {parts.map((part, index) => {
          const match = part.match(/^\[\[([^\]]+)\]\]$/);
          if (match) {
            const innerText = match[1];

            const toolSign = innerText.charAt(0);
            const citeIndex = parseInt(innerText.slice(1));
            const hasMatch = searchResults?.some(
              result => result.tool_sign === toolSign && result.cite_index === citeIndex
            );

            // Only show citation icon when matching search result is found
            if (hasMatch) {
              return <HoverableText key={index} text={innerText} searchResults={searchResults} />;
            } else {
              // Return empty string if no matching result found (display nothing)
              return '';
            }
          }
          return part;
        })}
      </>
    );
  };

  // Create wrapper component to handle different types of child elements
  const TextWrapper = ({ children }: { children: any }) => {
    if (typeof children === 'string') {
      return processText(children);
    }
    if (Array.isArray(children)) {
      return (
        <>
          {children.map((child, index) => {
            if (typeof child === 'string') {
              return <React.Fragment key={index}>{processText(child)}</React.Fragment>;
            }
            return child;
          })}
        </>
      );
    }
    return children;
  };
  
  return (
    <>
      <style jsx global>{`
        .markdown-body {
          background: transparent !important;
          min-height: 1em;
          padding-top: 0.5em;
          padding-bottom: 0.5em;
        }
        .markdown-body ul,
        .markdown-body ol {
          list-style-type: revert !important;
          list-style-position: revert !important;
          margin-left: revert !important;
          padding-left: revert !important;
        }
        .markdown-body li {
          display: list-item !important;
        }
        .markdown-body p {
          margin-bottom: 0.5rem !important;
          margin-top: 0.25rem !important;
        }
        .user-paragraph {
          margin-bottom: 0.25rem !important;
          margin-top: 0.25rem !important;
        }
      `}</style>
      <div className={`markdown-body ${className || ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({children}: any) => (
              <p className={`user-paragraph`}>
                <TextWrapper>{children}</TextWrapper>
              </p>
            ),
            blockquote: ({children}: any) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 italic text-base leading-relaxed">
                <TextWrapper>{children}</TextWrapper>
              </blockquote>
            ),
            code({node, inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter
                  style={customStyle}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/^\n+|\n+$/g, '')}
                </SyntaxHighlighter>
              ) : (
                <code {...props}>
                  <TextWrapper>{children}</TextWrapper>
                </code>
              )
            },
            img: ({src, alt}: any) => (
              <img src={src} alt={alt} />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
};