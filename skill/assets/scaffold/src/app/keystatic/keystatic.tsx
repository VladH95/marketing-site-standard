"use client";
import { makePage } from "@keystatic/next/ui/app";
import config from "../../../keystatic.config";

/** The admin UI itself. Client-only — it is an editor, not a rendered page. */
export default makePage(config);
