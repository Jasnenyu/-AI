/**
 * 模型参数定义
 */
export interface ParamDef {
  id: string
  type: 'string' | 'number' | 'boolean' | 'dropdown' | 'image' | 'text'
  label: string
  description?: string
  required?: boolean
  default?: any
  options?: { label: string; value: any }[]
  min?: number
  max?: number
  step?: number
}

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string
  name: string
  provider: string
  description?: string
  params: ParamDef[]
}
