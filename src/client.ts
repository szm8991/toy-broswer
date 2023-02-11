import net, { Socket } from 'node:net';
import { parseHTML } from './parser.js'; // for ts debug https://github.com/microsoft/TypeScript/issues/16577
// import { parseHTML } from './parser'
import { createViewport, render } from './render.js';
import { RequestConfig, Response } from './type';
const enum responseStatus {
  WAITING_STATUS_LINE = 0,
  WAITING_STATUS_LINE_END = 1,
  WAITING_HEADER_NAME = 2,
  WAITING_HEADER_SPACE = 3,
  WAITING_HEADER_VALUE = 4,
  WAITING_HEADER_LINE_END = 5,
  WAITING_HEADER_BLOCK_END = 6,
  WAITING_BODY = 7,
}

const enum bodyTrunkStatus {
  WAITING_LENGTH = 0,
  WAITING_LENGTH_LINE_END = 1,
  READING_TRUNK = 2,
  WAITING_NEW_LINE = 3,
  WAITING_NEW_LINE_END = 4,
}

class Request {
  public method: string
  public host: string
  public port: number
  public path: string
  public headers: Record<string, string | number>
  public body: Record<string, string | number>
  public bodyText: string = ''
  constructor(options: RequestConfig) {
    this.method = options.method || 'GET'
    this.host = options.host
    this.port = options.port || 80
    this.path = options.path || '/'
    this.headers = options.headers || {}
    this.body = options.body || {}
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    } else if ((this.headers['Content-Type'] = 'application/x-www-form-urlencoded')) {
      this.bodyText = Object.keys(this.body)
        .map(key => `${key}=${encodeURIComponent(this.body[key])}`)
        .join('&')
    }
    this.headers['Content-Length'] = this.bodyText?.length
  }
  send(connection?: Socket): Promise<Response> {
    return new Promise((resolve, reject) => {
      const parser = new ResponsePraser()
      if (connection) {
        connection.write(this.toString())
      } else {
        // 创建一个TCP连接
        connection = net.createConnection(
          {
            host: this.host,
            port: this.port,
          },
          () => {
            // 发送请求
            connection!.write(this.toString())
          }
        )
      }
      connection.on('data', data => {
        // console.log('----------------------------------')
        // console.log(data.toString())
        parser.receive(data.toString())
        // console.log(parser)
        if (parser.isFinished) {
          resolve(parser.response)
          connection!.end()
        }
      })
      connection.on('errpr', error => {
        // console.log('----------------------------------')
        // console.log(error.toString())
        reject(error)
        connection!.end()
      })
    })
  }
  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers)
  .map(key => `${key}: ${this.headers[key]}`)
  .join('\r\n')}\r

${this.bodyText}`
  }
}
class ResponsePraser {
  currentStatus: responseStatus = responseStatus.WAITING_STATUS_LINE
  statusLine: string = ''
  headers: Record<string, string | number> = {}
  headerName: string = ''
  headerValue: string | number = ''
  bodyParser: TrunkedBodyParser | null = null
  constructor() {}
  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished
  }
  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser!.content.join(''),
    }
  }
  receive(string: string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i))
    }
  }
  receiveChar(char: string) {
    if (this.currentStatus === responseStatus.WAITING_STATUS_LINE) {
      if (char === '\r') this.currentStatus = responseStatus.WAITING_STATUS_LINE_END
      else this.statusLine += char
    } else if (this.currentStatus === responseStatus.WAITING_STATUS_LINE_END) {
      if (char === '\n') this.currentStatus = responseStatus.WAITING_HEADER_NAME
    } else if (this.currentStatus === responseStatus.WAITING_HEADER_NAME) {
      if (char === ':') this.currentStatus = responseStatus.WAITING_HEADER_SPACE
      else if (char === '\r') {
        this.currentStatus = responseStatus.WAITING_HEADER_BLOCK_END
        if (this.headers['Transfer-Encoding'] === 'chunked')
          this.bodyParser = new TrunkedBodyParser()
      } else {
        this.headerName += char
      }
    } else if (this.currentStatus === responseStatus.WAITING_HEADER_SPACE) {
      if (char === ' ') this.currentStatus = responseStatus.WAITING_HEADER_VALUE
    } else if (this.currentStatus === responseStatus.WAITING_HEADER_VALUE) {
      if (char === '\r') {
        this.currentStatus = responseStatus.WAITING_HEADER_LINE_END
        this.headers[this.headerName] = this.headerValue
        this.headerName = ''
        this.headerValue = ''
      } else {
        this.headerValue += char
      }
    } else if (this.currentStatus === responseStatus.WAITING_HEADER_LINE_END) {
      if (char === '\n') this.currentStatus = responseStatus.WAITING_HEADER_NAME
    } else if (this.currentStatus === responseStatus.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') this.currentStatus = responseStatus.WAITING_BODY
    } else if (this.currentStatus === responseStatus.WAITING_BODY) {
      this.bodyParser?.receiveChar(char)
    }
  }
}

class TrunkedBodyParser {
  length: number = 0
  content: string[] = []
  isFinished: boolean = false
  currentStatus: bodyTrunkStatus = bodyTrunkStatus.WAITING_LENGTH
  constructor() {}
  receiveChar(char: string) {
    if (this.currentStatus === bodyTrunkStatus.WAITING_LENGTH) {
      if (char === '\r') {
        if (this.length === 0) this.isFinished = true
        this.currentStatus = bodyTrunkStatus.WAITING_LENGTH_LINE_END
      } else {
        this.length *= 16
        this.length += parseInt(char, 16)
        // console.log(this.length)
      }
    } else if (this.currentStatus === bodyTrunkStatus.WAITING_LENGTH_LINE_END) {
      if (char === '\n') this.currentStatus = bodyTrunkStatus.READING_TRUNK
    } else if (this.currentStatus === bodyTrunkStatus.READING_TRUNK) {
      this.content.push(char)
      this.length--
      if (this.length === 0) this.currentStatus = bodyTrunkStatus.WAITING_NEW_LINE
    } else if (this.currentStatus === bodyTrunkStatus.WAITING_NEW_LINE) {
      if (char === '\r') this.currentStatus = bodyTrunkStatus.WAITING_NEW_LINE_END
    } else if (this.currentStatus === bodyTrunkStatus.WAITING_NEW_LINE_END) {
      if (char === '\n') this.currentStatus = bodyTrunkStatus.WAITING_LENGTH
    }
  }
}
void (async function () {
  const request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: 8888,
    headers: {
      'X-Foo2': 'customed',
    },
    body: {
      name: 'hello',
    },
  })
  // console.log(request)
  // console.log(request.toString())
  const response = await request.send()
  // console.log(response)
  const dom = parseHTML(response.body)
  const viewport=createViewport(800,600)
  render(viewport,dom)
  viewport.save('res.jpg')
})()
