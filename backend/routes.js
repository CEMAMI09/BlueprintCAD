const fs = require("fs");
const path = require("path");

module.exports = function (app) {
  const apiDir = path.join(__dirname, "api");

  function loadRoutes(dir, routePrefix = "/api") {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        loadRoutes(fullPath, `${routePrefix}/${file}`);
      } else if (file.endsWith(".js")) {
        const routeHandler = require(fullPath);
        app.use(routePrefix, routeHandler);
        console.log(`Loaded route: ${routePrefix}/${file}`);
      }
    }
  }

  loadRoutes(apiDir);
};