import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdownMenu"
import {
  Clock,
  Settings,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { ConversationListItem } from "@/types/chat"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConfig } from "@/hooks/useConfig"
import { useResponsiveTextSize } from "@/hooks/useResponsiveTextSize"
import { extractColorsFromUri } from "@/lib/avatar"

interface ChatSidebarProps {
  conversationList: ConversationListItem[]
  selectedConversationId: number | null
  openDropdownId: string | null
  onNewConversation: () => void
  onDialogClick: (dialog: ConversationListItem) => void
  onRename: (dialogId: number, title: string) => void
  onDelete: (dialogId: number) => void
  onSettingsClick: () => void
  onDropdownOpenChange: (open: boolean, id: string | null) => void
  onToggleSidebar: () => void
  expanded: boolean
}

// Helper function - dialog classification
const categorizeDialogs = (dialogs: ConversationListItem[]) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000
  
  const todayDialogs: ConversationListItem[] = []
  const weekDialogs: ConversationListItem[] = []
  const olderDialogs: ConversationListItem[] = []
  
  dialogs.forEach(dialog => {
    const dialogTime = dialog.update_time || dialog.create_time
    
    if (dialogTime >= today) {
      todayDialogs.push(dialog)
    } else if (dialogTime >= weekAgo) {
      weekDialogs.push(dialog)
    } else {
      olderDialogs.push(dialog)
    }
  })
  
  return {
    today: todayDialogs,
    week: weekDialogs,
    older: olderDialogs
  }
}

export function ChatSidebar({
  conversationList,
  selectedConversationId,
  openDropdownId,
  onNewConversation,
  onDialogClick,
  onRename,
  onDelete,
  onSettingsClick,
  onDropdownOpenChange,
  onToggleSidebar,
  expanded,
}: ChatSidebarProps) {
  const { today, week, older } = categorizeDialogs(conversationList)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Add delete dialog status
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogToDelete, setDialogToDelete] = useState<number | null>(null);
  
  // Use the configuration system to get the avatar content
  const { appConfig, getAppAvatarUrl } = useConfig();

  const sidebarAvatarUrl = getAppAvatarUrl(16); // The avatar size of the sidebar is 16
  const collapsedAvatarUrl = getAppAvatarUrl(16); // The avatar size of the collapsed state is 16

  // Calculate the container width (300px - icon width - button width - padding)
  const containerWidth = 300 - 40 - 40 - 40; // Approximately 180px available space

  // Use the responsive text size hook
  const { textRef, fontSize } = useResponsiveTextSize(appConfig.appName, containerWidth);

  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Reset animation state when expanded changes
    setAnimationComplete(false);

    // Set animation complete after the transition duration (200ms)
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [expanded]);

  // Handle edit start
  const handleStartEdit = (dialogId: number, title: string) => {
    setEditingId(dialogId);
    setEditingTitle(title);
    // Close any open dropdown menus
    onDropdownOpenChange(false, null);
    
    // Use setTimeout to ensure that the input box is focused after the DOM is updated
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };
  
  // Handle edit submission
  const handleSubmitEdit = () => {
    if (editingId !== null && editingTitle.trim()) {
      onRename(editingId, editingTitle.trim());
      setEditingId(null);
    }
  };
  
  // Handle edit cancellation
  const handleCancelEdit = () => {
    setEditingId(null);
  };
  
  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Handle delete click
  const handleDeleteClick = (dialogId: number) => {
    setDialogToDelete(dialogId);
    setIsDeleteDialogOpen(true);
    // Close dropdown menus
    onDropdownOpenChange(false, null);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (dialogToDelete !== null) {
      onDelete(dialogToDelete);
      setIsDeleteDialogOpen(false);
      setDialogToDelete(null);
    }
  };

  // Render application icon
  const renderAppIcon = () => {
    return (
      <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
        <img src={sidebarAvatarUrl} alt={appConfig.appName} className="h-full w-full object-cover" />
      </div>
    );
  };

  // Render dialog list items
  const renderDialogList = (dialogs: ConversationListItem[], title: string) => {
    if (dialogs.length === 0) return null;

    return (
      <div className="space-y-1">
        <p className="px-2 text-sm font-medium text-gray-500 tracking-wide font-sans sticky top-0 py-1 z-10" style={{ fontWeight:'bold',color:'#4d4d4d',backgroundColor: 'rgb(242 248 255)',fontSize:'16px', whiteSpace: 'nowrap' }}>{title}</p>
        {dialogs.map((dialog) => (
          <div 
            key={dialog.conversation_id} 
            className={`flex items-center group rounded-md ${
              selectedConversationId === dialog.conversation_id ? "bg-blue-100" : "hover:bg-slate-100"
            }`}
          >
            {editingId === dialog.conversation_id ? (
              // Edit mode
              <div className="flex-1 px-3 py-2">
                <Input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSubmitEdit}
                  className="h-8 text-base"
                  autoFocus
                />
              </div>
            ) : (
              // Display mode
              <>
                <Button
                  variant="ghost"
                  className="flex-1 justify-start text-left hover:bg-transparent min-w-0"
                  onClick={() => onDialogClick(dialog)}
                >
                  <span className="truncate block text-base font-normal text-gray-800 tracking-wide font-sans">{dialog.conversation_title}</span>
                </Button>
                
                <DropdownMenu 
                  open={openDropdownId === dialog.conversation_id.toString()} 
                  onOpenChange={(open) => onDropdownOpenChange(open, dialog.conversation_id.toString())}
                >
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:border hover:border-slate-200 mr-1"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom">
                    <DropdownMenuItem onClick={() => handleStartEdit(dialog.conversation_id, dialog.conversation_title)}>
                      <Pencil className="mr-2 h-5 w-5" />
                      重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteClick(dialog.conversation_id)}
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render collapsed state sidebar
  const renderCollapsedSidebar = () => {
    return (
      <>
        {/* Application icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-start p-4 cursor-pointer" onClick={onToggleSidebar}>
                <div className="h-8 w-8 rounded-full overflow-hidden">
                  <img src={collapsedAvatarUrl} alt={appConfig.appName} className="h-full w-full object-cover" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {appConfig.appName}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex flex-col flex-1 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-14 w-14 rounded-full hover:bg-slate-100"
                  onClick={onToggleSidebar}
                >
                  <ChevronRight className="h-6 w-6" style={{height:'28px',width:'28px'}}/>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                展开边栏
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-14 w-14 rounded-full hover:bg-slate-100"
                  onClick={onNewConversation}
                >
                  <Plus className="h-6 w-6" style={{height:'20px',width:'20px'}}/>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                新对话
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Bottom area */}
        {/* Settings button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-slate-100"
                  onClick={onSettingsClick}
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              设置
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  };

  const colors = extractColorsFromUri(appConfig.avatarUri || '');
  const mainColor = colors.mainColor || '273746';
  const secondaryColor = colors.secondaryColor || mainColor;

  return (
    <>
      <div className="hidden md:flex w-64 flex-col border-r border-transparent bg-primary/5 text-base transition-all duration-300 ease-in-out" style={{width: expanded ? '300px' : '70px'}}>
        {(expanded || !animationComplete) ? (
          <div className="hidden md:flex flex-col h-full">
            <div className="p-2 border-b border-transparent">
              <div className="flex items-center p-2">
                <div className="flex-1 min-w-0 flex items-center justify-start cursor-pointer" onClick={onToggleSidebar}>
                  <div>{renderAppIcon()}</div>
                  <h1
                    ref={textRef}
                    className="font-semibold truncate bg-clip-text text-transparent"
                    style={{ 
                      fontSize: `${fontSize}px`,
                      backgroundImage: `linear-gradient(180deg, #${mainColor} 0%, #${secondaryColor} 100%)`
                    }}
                  >
                    {appConfig.appName}
                  </h1>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-slate-100"
                  onClick={onToggleSidebar}
                >
                  <ChevronLeft className="h-7 w-7" style={{height:'28px',width:'28px'}}/>
                </Button>
              </div>
            </div>

            <div className="p-2">
              <Button variant="outline" className="w-full justify-start text-base overflow-hidden" onClick={onNewConversation}>
                <Plus className="mr-2 flex-shrink-0" style={{height:'20px', width:'20px'}}/>
                <span className="truncate">新对话</span>
              </Button>
            </div>

            <div className="flex-1 overflow-auto m-2 h-fit" >
              <div className="space-y-4">
                {conversationList.length > 0 ? (
                  <>
                    {renderDialogList(today, "今天")}
                    {renderDialogList(week, "7天内")}
                    {renderDialogList(older, "更早")}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="px-2 text-sm font-medium text-muted-foreground">最近对话</p>
                    <Button variant="ghost" className="w-full justify-start">
                      <Clock className="mr-2 h-5 w-5" />
                      无历史对话
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto p-3 border-t border-transparent flex justify-between items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-slate-100"
                onClick={onSettingsClick}
              >
                <Settings className="h-8 w-8" />
              </Button>
            </div>
          </div>
        ) : (
          renderCollapsedSidebar()
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
            <DialogDescription>
              确定要删除这个对话吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}