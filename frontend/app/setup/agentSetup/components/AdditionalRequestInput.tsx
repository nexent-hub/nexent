"use client"

import { useState } from 'react'
import { Input, Button } from 'antd'

// Additional request input component Props interface
export interface AdditionalRequestInputProps {
  onSend: (request: string) => void;
  isTuning?: boolean;
}

/**
 * Additional request input component
 */
export default function AdditionalRequestInput({ onSend, isTuning = false }: AdditionalRequestInputProps) {
  const [request, setRequest] = useState("")
  
  const handleSend = () => {
    if (request.trim()) {
      onSend(request)
      setRequest("")
    }
  }
  
  return (
    <div className="flex flex-col items-end">
      <Input.TextArea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        placeholder="输入提示词微调指令..."
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        rows={7}
        style={{ resize: 'none' }}
        disabled={isTuning}
      />
      <Button 
        type="primary" 
        onClick={handleSend} 
        className="mt-2"
        disabled={isTuning || !request.trim()}
        loading={isTuning}
      >
        {isTuning ? "微调中..." : "发送"}
      </Button>
    </div>
  )
} 