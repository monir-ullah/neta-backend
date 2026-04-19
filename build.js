// Minimal build file for Render deployment
// Render will run: npm run build (transpiles TypeScript)
import esbuild from "esbuild";

esbuild.buildSync({
  entryPoints: ["server.ts"],
  outfile: "dist/server.js",
  bundle: false,
  platform: "node",
  target: "node18",
});

console.log("✅ Build complete");
