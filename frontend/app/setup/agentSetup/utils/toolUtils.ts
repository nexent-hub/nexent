import { message } from 'antd';
import { Tool } from '../ConstInterface';
import { searchToolConfig, updateToolConfig } from '@/services/agentConfigService';

export const handleToolSelectCommon = async (
  tool: Tool,
  isSelected: boolean,
  mainAgentId: string | null | undefined,
  onSuccess?: (tool: Tool, isSelected: boolean) => void
) => {
  if (!mainAgentId) {
    message.error('主代理ID未设置，无法更新工具状态');
    return { shouldProceed: false, params: {} };
  }

  try {
    // step 1: get tool config from database
    const searchResult = await searchToolConfig(parseInt(tool.id), parseInt(mainAgentId));
    if (!searchResult.success) {
      message.error('获取工具配置失败');
      return { shouldProceed: false, params: {} };
    }

    let params: Record<string, any> = {};

    // use config from database or default config
    if (searchResult.data?.params) {
      params = searchResult.data.params || {};
    } else {
      // if there is no saved config, use default value
      params = (tool.initParams || []).reduce((acc, param) => {
        if (param && param.name) {
          acc[param.name] = param.value;
        }
        return acc;
      }, {} as Record<string, any>);
    }

    // step 2: if the tool is enabled, check required fields
    if (isSelected && tool.initParams && tool.initParams.length > 0) {
      const missingRequiredFields = tool.initParams
        .filter(param => param && param.required && (params[param.name] === undefined || params[param.name] === '' || params[param.name] === null))
        .map(param => param.name);

      if (missingRequiredFields.length > 0) {
        return { shouldProceed: false, params };
      }
    }

    // step 3: if all checks pass, update tool config
    const updateResult = await updateToolConfig(
      parseInt(tool.id),
      parseInt(mainAgentId),
      params,
      isSelected
    );

    if (updateResult.success) {
      if (onSuccess) {
        onSuccess(tool, isSelected);
      }
      return { shouldProceed: true, params };
    } else {
      message.error(updateResult.message || '更新工具状态失败');
      return { shouldProceed: false, params };
    }
  } catch (error) {
    console.error('更新工具状态失败:', error);
    message.error('更新工具状态失败，请稍后重试');
    return { shouldProceed: false, params: {} };
  }
}; 