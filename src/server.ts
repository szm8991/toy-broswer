import http from 'node:http'
export const html = `<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <style>
    body div #id {
      width: 50px;
      padding-top: 20px;
      padding-bottom: 20px;
    }
    body div img{
      width: 75px;
    }
    body .demo {
      width: 100px;
      font: 16px;
      font-size: 1.2;
    }
  </style>
</head>
<body>
  <h1>Hello Toy Browser!</h1>
  <div class="demo" >
    <img id="id" />
    <img style />
  </div>
  <script>
      function p2() {
        console.log('p2');
      }
  </script>
</body>
</html>`
export const html2 = `<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <style>
    .container {
      width: 500px;
      height: 300px;
      display: flex;
      background-color: rgb(255,255,255);
    }
    .container #id {
      width: 200px;
      height: 100px;
      background-color: rgb(255,0,0);
    }
    .container .ccc{
      flex: 1;
      background-color: rgb(0,255,0);
    }
  </style>
</head>
<body>
  <div class="container" >
    <div id="id"></div>
    <div class="ccc"></div>
  </div>
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
        // response.end(html)
        response.end(html2)
      })
  })
  .listen(8888)

console.log('server started')
