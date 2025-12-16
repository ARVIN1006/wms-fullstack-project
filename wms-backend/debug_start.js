const fs = require("fs");
console.log = function (msg) {
  fs.appendFileSync("debug_log.txt", "LOG: " + msg + "\n");
};
console.error = function (msg) {
  fs.appendFileSync("debug_log.txt", "ERR: " + msg + "\n");
};

process.on("uncaughtException", (err) => {
  fs.appendFileSync(
    "debug_log.txt",
    "UNCAUGHT: " + err.message + "\n" + err.stack + "\n"
  );
});

try {
  fs.writeFileSync("debug_log.txt", "Starting...\n");
  require("./index.js");
} catch (e) {
  fs.appendFileSync(
    "debug_log.txt",
    "REQUIRE ERROR: " + e.message + "\n" + e.stack + "\n"
  );
}
