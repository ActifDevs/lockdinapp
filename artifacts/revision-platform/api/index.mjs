// Vercel function entry: the Express app is prebuilt by @workspace/api-server so
// that Vercel never has to compile the workspace TypeScript sources itself.
export { default } from "../../api-server/dist/index.mjs";
