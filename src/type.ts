export type Method =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK'

export type HTMLToken = {
  type: string
  content?: string
  name?: string
  tagName?: string
  isSelfClosing?: boolean
  [propName: string]: any
}

export type HTMLElement = {
  type: string
  parent?: HTMLElement
  children?: HTMLElement[]
  attributes?: Attribute[]
  tagName?: string
  content?: string
  computedStyle?: Record<string, Record<string, string>>
}

export type Attribute = {
  name: string
  value?: string
}

export interface RequestConfig<D = any> {
  url?: string
  method?: Method | string
  host: string
  port?: number
  path?: string
  headers?: Record<string, string>
  body?: Record<string, string>
  data?: D
}
export interface Response<T = any> {
  statusCode: string
  statusText: string
  headers: Record<string, string | number>
  body: string
}
