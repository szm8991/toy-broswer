import http from 'node:http'
export const html = `<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <style>
    .demo {
      padding-top: 20px;
      padding-bottom: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="demo" style data-set >
    demo
  </div>
  <script>
      function p2() {
        console.log('p2');
      }
    </script>
</body>
</html>`
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
        console.log('header:', request.headers)
        const res = Buffer.concat(body).toString()
        console.log('body:', res)
        response.setHeader('X-Foo', 'bar')
        response.writeHead(200, { 'Content-Type': 'text/html' })
        response.end(html)
      })
  })
  .listen(8888)

console.log('server started')
