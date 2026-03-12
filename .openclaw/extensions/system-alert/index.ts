import { OpenClawPluginApi } from "../../../src/plugins/types.js";

export default function register(api: OpenClawPluginApi) {
  api.logger.info("System Alert Plugin registering...");

  api.registerCommand({
    name: "alert",
    description: "Send a system alert to the current channel",
    execute: async (ctx) => {
      const prefix = api.pluginConfig?.alertPrefix || "[ALERT]";
      const message = ctx.args.join(" ") || "No message provided";
      
      await ctx.reply(`${prefix} ${message}`);
      return { ok: true };
    }
  });

  api.logger.info("System Alert Plugin registered successfully!");
}
