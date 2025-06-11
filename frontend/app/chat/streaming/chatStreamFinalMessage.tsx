import { useEffect, useRef, useState } from "react"
import { MarkdownRenderer } from '@/components/ui/markdownRenderer'
import { ChatMessageType } from '@/types/chat'
import { Copy, Volume2, ChevronRight, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FaRegThumbsDown, FaRegThumbsUp } from "react-icons/fa"
import { useConfig } from "@/hooks/useConfig"
import { ChatAttachment, AttachmentItem } from '@/app/chat/internal/chatAttachment'
import { conversationService } from '@/services/conversationService'

interface FinalMessageProps {
  message: ChatMessageType
  onSelectMessage?: (messageId: string) => void
  isSelected?: boolean
  searchResultsCount?: number
  imagesCount?: number
  onImageClick?: (imageUrl: string) => void
  onOpinionChange?: (messageId: number, opinion: 'Y' | 'N' | null) => void
  hideButtons?: boolean
  index?: number
  currentConversationId?: number
}

// TTS playback status
type TTSStatus = 'idle' | 'generating' | 'playing' | 'error';

export function ChatStreamFinalMessage({
  message,
  onSelectMessage,
  isSelected = false,
  searchResultsCount = 0,
  imagesCount = 0,
  onImageClick,
  onOpinionChange,
  hideButtons = false,
  index,
  currentConversationId,
}: FinalMessageProps) {
  const { getAppAvatarUrl } = useConfig();
  const avatarUrl = getAppAvatarUrl(20); // Message avatar size is 20px
  
  const messageRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [localOpinion, setLocalOpinion] = useState<string | null>(message.opinion_flag ?? null);
  const [isVisible, setIsVisible] = useState(false);
  
  // TTS related states
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
  const ttsServiceRef = useRef<ReturnType<typeof conversationService.tts.createTTSService> | null>(null);

  // Animation effect - message enters and fades in
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Update opinion status
  useEffect(() => {
    setLocalOpinion(message.opinion_flag ?? null);
  }, [message.opinion_flag]);

  // Initialize TTS service
  useEffect(() => {
    if (!ttsServiceRef.current) {
      ttsServiceRef.current = conversationService.tts.createTTSService();
    }
    
    return () => {
      if (ttsServiceRef.current) {
        ttsServiceRef.current.cleanup();
        ttsServiceRef.current = null;
      }
    };
  }, []);

  // Copy content to clipboard
  const handleCopyContent = () => {
    if (message.finalAnswer) {
      navigator.clipboard.writeText(message.finalAnswer)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error("复制失败:", err);
        });
    }
  };

  // Handle thumbs up
  const handleThumbsUp = async () => {
    const newOpinion = localOpinion === 'Y' ? null : 'Y';
    setLocalOpinion(newOpinion);

    let messageId = message.message_id;

    // If the message_id does not exist, fetch/obtain it via getMessageId.
    if (!messageId && typeof currentConversationId === 'number' && typeof index === 'number') {
      try {
        messageId = await conversationService.getMessageId(currentConversationId, index);
      } catch (error) {
        console.error('获取消息ID失败:', error);
        return;
      }
    }

    if (onOpinionChange && messageId) {
      onOpinionChange(messageId, newOpinion as 'Y' | 'N' | null);
    }
  };

  // Handle thumbs down
  const handleThumbsDown = () => {
    const newOpinion = localOpinion === 'N' ? null : 'N';
    setLocalOpinion(newOpinion);
    if (onOpinionChange && message.message_id) {
      onOpinionChange(message.message_id, newOpinion as 'Y' | 'N' | null);
    }
  };

  // Handle message selection
  const handleMessageSelect = () => {
    if (message.id && onSelectMessage) {
      onSelectMessage(message.id);
    }
  };

  // TTS functionality - using service layer
  const handleTTSPlay = async () => {
    if (!message.finalAnswer || !ttsServiceRef.current) return;

    if (ttsStatus === 'playing') {
      ttsServiceRef.current.stopAudio();
      setTtsStatus('idle');
      return;
    }

    try {
      await ttsServiceRef.current.playAudio(message.finalAnswer, (status) => {
        setTtsStatus(status);
      });
    } catch (error) {
      setTtsStatus('error');
      setTimeout(() => setTtsStatus('idle'), 2000);
    }
  };

  // Get TTS button icon and status
  const getTTSButtonContent = () => {
    switch (ttsStatus) {
      case 'generating':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          tooltip: '正在生成语音...',
          className: 'bg-blue-100 text-blue-600 border-blue-200'
        };
      case 'playing':
        return {
          icon: <Square className="h-4 w-4" />,
          tooltip: '停止播放',
          className: 'bg-red-100 text-red-600 border-red-200'
        };
      case 'error':
        return {
          icon: <Volume2 className="h-4 w-4" />,
          tooltip: '语音生成失败',
          className: 'bg-red-100 text-red-600 border-red-200'
        };
      default:
        return {
          icon: <Volume2 className="h-4 w-4" />,
          tooltip: '语音播报',
          className: 'bg-white hover:bg-gray-100'
        };
    }
  };

  const ttsButtonContent = getTTSButtonContent();

  return (
    <div 
      ref={messageRef}
      className={`flex gap-3 mb-4 transition-all duration-500 ${
        message.role === "user" ? 'flex-row-reverse' : ''
      } ${!isVisible ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
    >
      {/* Message content part */}
      <div className={`${
        message.role === "user" 
          ? 'flex items-end flex-col w-full' 
          : 'w-full'
      }`}>
        {/* User message part */}
        {message.role === "user" && (
          <>
            {/* Attachment part - placed above text */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 w-full flex justify-end">
                <div className="max-w-[80%]">
                  <ChatAttachment 
                    attachments={message.attachments as AttachmentItem[]} 
                    onImageClick={onImageClick}
                    className="justify-end" // Align right
                  />
                </div>
              </div>
            )}
            
            {/* Text content */}
            {message.content && (
              <div className="rounded-lg border bg-blue-50 border-blue-100 user-message-container px-3 ml-auto text-normal" style={{
                maxWidth: "80%",
                wordWrap: "break-word",
                wordBreak: "break-word",
                overflowWrap: "break-word"
              }}>
                <div className="user-message-content whitespace-pre-wrap py-2" style={{
                  wordWrap: "break-word",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  maxWidth: "100%"
                }}>
                  {message.content}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Assistant message part - only show final answer */}
        {message.role === "assistant" && message.finalAnswer && (
          <div className="bg-white rounded-lg w-full -mt-2">
            <MarkdownRenderer 
              content={message.finalAnswer} 
              searchResults={message.searchResults}
            />
            
            {/* Button group - only show when hideButtons is false */}
            {!hideButtons && (
              <div className="flex items-center justify-between mt-3">
                {/* Source button */}
                <div className="flex-1">
                    {((message.searchResults && message.searchResults.length > 0) || (message.images && message.images.length > 0)) && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-1 p-1 pl-3 hover:bg-gray-100 rounded transition-all duration-200 border border-gray-200 ${
                            isSelected ? 'bg-gray-100' : ''
                          }`}
                          onClick={handleMessageSelect}
                        >
                          <span>
                            {`${searchResultsCount ? `${searchResultsCount}条来源` : ""}${searchResultsCount && imagesCount ? "，" : ""}${imagesCount ? `${imagesCount}张图片` : ""}`}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                </div>

                {/* Tool button */}
                <div className="flex items-center space-x-2 mt-1 justify-end">
                  <TooltipProvider>
                    {/* Copy button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`h-8 w-8 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 shadow-sm ${
                            copied ? "bg-green-100 text-green-600 border-green-200" : ""
                          }`}
                          onClick={handleCopyContent}
                          disabled={copied}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied ? "已复制" : "复制内容"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Thumbs up button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={localOpinion === 'Y' ? "secondary" : "outline"}
                          size="icon"
                          className={`h-8 w-8 rounded-full ${localOpinion === 'Y' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-white hover:bg-gray-100'} transition-all duration-200 shadow-sm`}
                          onClick={handleThumbsUp}
                        >
                          <FaRegThumbsUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{localOpinion === 'Y' ? "取消点赞" : "点赞"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Thumbs down button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={localOpinion === 'N' ? "secondary" : "outline"}
                          size="icon"
                          className={`h-8 w-8 rounded-full ${localOpinion === 'N' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white hover:bg-gray-100'} transition-all duration-200 shadow-sm`}
                          onClick={handleThumbsDown}
                        >
                          <FaRegThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{localOpinion === 'N' ? "取消点踩" : "点踩"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Voice playback button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`h-8 w-8 rounded-full ${ttsButtonContent.className} transition-all duration-200 shadow-sm`}
                          onClick={handleTTSPlay}
                          disabled={ttsStatus === 'generating' || !message.finalAnswer}
                        >
                          {ttsButtonContent.icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{ttsButtonContent.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 