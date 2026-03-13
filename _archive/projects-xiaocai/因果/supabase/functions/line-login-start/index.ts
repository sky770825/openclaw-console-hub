import {
  getLineCallbackUrl,
  getLineChannelId,
  getLineLoginScope,
  sanitizeReturnTo,
  signState,
} from "../_shared/line-login.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get("return_to"), request);
    const nonce = crypto.randomUUID();
    const state = await signState({
      nonce,
      return_to: returnTo,
      provider: "line",
    });

    const authorizeUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", getLineChannelId());
    authorizeUrl.searchParams.set("redirect_uri", getLineCallbackUrl());
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", getLineLoginScope());
    authorizeUrl.searchParams.set("nonce", nonce);

    return Response.redirect(authorizeUrl.toString(), 302);
  } catch (err) {
    console.error("line-login-start failed:", err);
    return new Response("LINE login is not configured.", { status: 500 });
  }
});
