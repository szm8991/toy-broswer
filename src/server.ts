import http from 'node:http'

http
  .createServer((request, response) => {
    const body: Buffer[] = []
    request
      .on('error', e => {
        console.error(e)
      })
      .on('data', (chunk: Buffer) => {
        body.push(chunk)
      })
      .on('end', () => {
        const res = Buffer.concat(body).toString()
        console.log('body:', res)
        response.writeHead(200, { 'Content-Type': 'text/html' })
        response.end('  Hello World\n')
      })
  })
  .listen(8888)

console.log('server started')
