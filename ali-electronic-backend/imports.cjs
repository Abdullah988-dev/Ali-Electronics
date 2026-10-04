const fs = require("fs");
const path = require("path");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === "node_modules" ? [] : walk(full)) : [full];
  });

let missing = 0;
for (const file of [...walk("src"), ...walk("database")].filter((f) => f.endsWith(".js"))) {
  const text = fs.readFileSync(file, "utf8");
  const re = /(?:from|import)\s+["'](\.[^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) {
    const target = path.resolve(path.dirname(file), m[1]);
    if (!fs.existsSync(target)) {
      missing++;
      console.log(`MISSING: ${m[1]}\n    imported in ${file}`);
    }
  }
}
console.log(missing ? `\n${missing} file(s) missing` : "Sab imports theek hain");