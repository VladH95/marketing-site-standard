import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "../../../../../keystatic.config";

/**
 * Server side of the editor: reads and writes content, and in GitHub mode
 * handles the sign-in that turns a save into a commit.
 */
export const { POST, GET } = makeRouteHandler({ config });
