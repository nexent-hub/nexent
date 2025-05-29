"use client"

import { useState, useEffect } from 'react'
import { Modal, Input, Switch, Select, InputNumber, Tag, message } from 'antd'
import { Tool, ToolParam, OpenAIModel } from '../ConstInterface'
import { updateToolConfig, searchToolConfig } from '@/services/agentConfigService'

interface ToolConfigModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSave: (tool: Tool) => void;
  tool: Tool | null;
  mainAgentId: number;
  selectedTools?: Tool[];
}

export default function ToolConfigModal({ isOpen, onCancel, onSave, tool, mainAgentId, selectedTools = [] }: ToolConfigModalProps) {
  const [currentParams, setCurrentParams] = useState<ToolParam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // load tool config
  useEffect(() => {
    const loadToolConfig = async () => {
      if (tool && mainAgentId) {
        setIsLoading(true);
        try {
          const result = await searchToolConfig(parseInt(tool.id), mainAgentId);
          if (result.success) {
            if (result.data?.params) {
              // use backend returned config content
              const savedParams = tool.initParams.map(param => {
                // if backend returned config has this param value, use backend returned value
                // otherwise use param default value
                const savedValue = result.data.params[param.name];
                return {
                  ...param,
                  value: savedValue !== undefined ? savedValue : param.value
                };
              });
              setCurrentParams(savedParams);
            } else {
              // if backend returned params is null, means no saved config, use default config
              setCurrentParams(tool.initParams.map(param => ({
                ...param,
                value: param.value // use default value
              })));
            }
          } else {
            message.error(result.message || '加载工具配置失败');
            // when load failed, use default config
            setCurrentParams(tool.initParams.map(param => ({
              ...param,
              value: param.value
            })));
          }
        } catch (error) {
          console.error('加载工具配置失败:', error);
          message.error('加载工具配置失败，使用默认配置');
          // when error occurs, use default config
          setCurrentParams(tool.initParams.map(param => ({
            ...param,
            value: param.value
          })));
        } finally {
          setIsLoading(false);
        }
      } else {
        // if there is no tool or mainAgentId, clear params
        setCurrentParams([]);
      }
    };

    if (isOpen && tool) {
      loadToolConfig();
    } else {
      // when modal is closed, clear params
      setCurrentParams([]);
    }
  }, [isOpen, tool, mainAgentId]);

  // check required fields
  const checkRequiredFields = () => {
    if (!tool) return false;
    
    const missingRequiredFields = currentParams
      .filter(param => param.required && (param.value === undefined || param.value === '' || param.value === null))
      .map(param => param.name);

    if (missingRequiredFields.length > 0) {
      message.error(`以下必填字段未填写: ${missingRequiredFields.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleParamChange = (index: number, value: any) => {
    const newParams = [...currentParams];
    newParams[index] = { ...newParams[index], value };
    setCurrentParams(newParams);
  };

  const handleSave = async () => {
    if (!tool || !checkRequiredFields()) return;

    try {
      // convert params to backend format
      const params = currentParams.reduce((acc, param) => {
        acc[param.name] = param.value;
        return acc;
      }, {} as Record<string, any>);

      // decide enabled status based on whether the tool is in selectedTools
      const isEnabled = selectedTools.some(t => t.id === tool.id);

      const result = await updateToolConfig(
        parseInt(tool.id),
        mainAgentId,
        params,
        isEnabled
      );

      if (result.success) {
        message.success('工具配置保存成功');
        onSave({
          ...tool,
          initParams: currentParams
        });
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存工具配置失败:', error);
      message.error('保存失败，请稍后重试');
    }
  };

  // determine textbox rows based on string length, max 5 rows
  const getTextAreaRows = (value: string): number => {
    if (!value) return 1;
    const length = value.length;
    if (length < 15) return 1;
    if (length < 30) return 2;
    if (length < 45) return 3;
    if (length < 60) return 4;
    return 5;
  };

  const renderParamInput = (param: ToolParam, index: number) => {
    switch (param.type) {
      case 'OpenAIModel':
        return (
          <Select
            value={param.value as string}
            onChange={(value) => handleParamChange(index, value)}
            placeholder="请选择模型"
            style={{ width: '100%' }}
            options={[
              { label: '主模型', value: OpenAIModel.MainModel },
              { label: '副模型', value: OpenAIModel.SubModel }
            ]}
          />
        );
      case 'string':
        const stringValue = param.value as string;
        // if string length is greater than 15, use TextArea
        if (stringValue && stringValue.length > 15) {
          return (
            <Input.TextArea
              value={stringValue}
              onChange={(e) => handleParamChange(index, e.target.value)}
              placeholder={`请输入${param.name}`}
              rows={getTextAreaRows(stringValue)}
              style={{ resize: 'vertical' }}
            />
          );
        }
        return (
          <Input
            value={stringValue}
            onChange={(e) => handleParamChange(index, e.target.value)}
            placeholder={`请输入${param.name}`}
          />
        );
      case 'number':
        return (
          <InputNumber
            value={param.value as number}
            onChange={(value) => handleParamChange(index, value)}
            className="w-full"
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={param.value as boolean}
            onChange={(checked) => handleParamChange(index, checked)}
          />
        );
      case 'array':
        const arrayValue = Array.isArray(param.value) ? JSON.stringify(param.value, null, 2) : param.value as string;
        return (
          <Input.TextArea
            value={arrayValue}
            onChange={(e) => {
              try {
                const value = JSON.parse(e.target.value);
                handleParamChange(index, value);
              } catch {
                handleParamChange(index, e.target.value);
              }
            }}
            placeholder="请输入JSON数组"
            rows={getTextAreaRows(arrayValue)}
            style={{ resize: 'vertical' }}
          />
        );
      case 'object':
        const objectValue = typeof param.value === 'object' ? JSON.stringify(param.value, null, 2) : param.value as string;
        return (
          <Input.TextArea
            value={objectValue}
            onChange={(e) => {
              try {
                const value = JSON.parse(e.target.value);
                handleParamChange(index, value);
              } catch {
                handleParamChange(index, e.target.value);
              }
            }}
            placeholder="请输入JSON对象"
            rows={getTextAreaRows(objectValue)}
            style={{ resize: 'vertical' }}
          />
        );
      default:
        return <Input value={param.value as string} onChange={(e) => handleParamChange(index, e.target.value)} />;
    }
  };

  if (!tool) return null;

  return (
    <Modal
      title={
        <div className="flex justify-between items-center w-full pr-8">
          <span>{`${tool?.name}`}</span>
          <Tag color={tool?.source === 'mcp' ? 'blue' : 'green'}>
            {tool?.source === 'mcp' ? 'MCP' : '本地工具'}
          </Tag>
        </div>
      }
      open={isOpen}
      onCancel={onCancel}
      onOk={handleSave}
      width={600}
      confirmLoading={isLoading}
    >
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-4">{tool?.description}</p>
        <div className="text-sm font-medium mb-2">参数配置</div>
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <div className="space-y-4 pr-2">
            {currentParams.map((param, index) => (
              <div key={param.name} className="border-b pb-4 mb-4 last:border-b-0 last:mb-0">
                <div className="flex items-start gap-4">
                  <div className="flex-1 pt-1">
                    {param.description ? (
                      <div className="text-sm text-gray-600">
                        {param.description}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {renderParamInput(param, index)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
} 