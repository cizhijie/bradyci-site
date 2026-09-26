const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

http
  .createServer((request, response) => {
    const pathname = request.url === "/" ? "/index.html" : request.url;
    const filePath = path.join(root, pathname.split("?")[0]);

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      });
      response.end(data);
    });
  })
  .listen(4173, "127.0.0.1");
