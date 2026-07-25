import express from "express";
import bundledApp from "./dist/index.mjs";

// Entry must import express for Vercel framework detection.
void express;

export default bundledApp;
