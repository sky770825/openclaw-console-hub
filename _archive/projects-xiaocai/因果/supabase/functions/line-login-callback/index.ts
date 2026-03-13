import {
  buildPseudoEmail,
  buildRedirectUrl,
  exchangeLineCode,
  getSiteUrl,
  getServiceClient,
  issueAppJwt,
  toSafeMessage,
  trimDisplayName,
  verifyLineIdToken,
  verifyState,
} from "../_shared/line-login.ts";

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const code = requestUrl.searchParams.get("code") || "";
  const stateToken = requestUrl.searchParams.get("state") || "";

  let returnTo = getSiteUrl();
  let nonce = "";

  try {
    if (!stateToken) throw new Error("LINE state missing");
    const state = await verifyState(stateToken);
    returnTo = String(state.return_to || returnTo);
    nonce = String(state.nonce || "");
  } catch (err) {
    console.error("line-login-callback invalid state:", err);
    return Response.redirect(buildRedirectUrl(returnTo, {
      cl_provider: "line",
      cl_auth_error: "line_state_invalid",
      cl_auth_error_description: "LINE 登入狀態已失效，請重新登入。",
    }), 302);
  }

  if (error) {
    return Response.redirect(buildRedirectUrl(returnTo, {
      cl_provider: "line",
      cl_auth_error: error,
      cl_auth_error_description: errorDescription || "LINE 拒絕登入要求。",
    }), 302);
  }

  if (!code) {
    return Response.redirect(buildRedirectUrl(returnTo, {
      cl_provider: "line",
      cl_auth_error: "line_code_missing",
      cl_auth_error_description: "LINE 沒有回傳登入授權碼。",
    }), 302);
  }

  try {
    const tokenPayload = await exchangeLineCode(code);
    const idToken = String(tokenPayload.id_token || "");
    if (!idToken) throw new Error("LINE id_token missing");

    const claims = await verifyLineIdToken(idToken, nonce);
    const lineUserId = String(claims.sub || "");
    if (!lineUserId) throw new Error("LINE user id missing");

    const lineEmail = claims.email ? String(claims.email) : null;
    const lineDisplayName = trimDisplayName(String(claims.name || ""));
    const linePicture = claims.picture ? String(claims.picture) : null;

    const supabase = getServiceClient();
    const identityQuery = await supabase
      .from("external_identities")
      .select("id,member_id")
      .eq("provider", "line")
      .eq("provider_user_id", lineUserId)
      .maybeSingle();

    if (identityQuery.error) throw identityQuery.error;

    let memberId = identityQuery.data ? String(identityQuery.data.member_id) : "";
    if (!memberId) {
      let createUserResult = await supabase.auth.admin.createUser({
        email: await buildPseudoEmail(lineUserId),
        email_confirm: true,
        user_metadata: {
          display_name: lineDisplayName,
          avatar_url: linePicture,
          provider: "line",
          line_user_id: lineUserId,
        },
        app_metadata: {
          provider: "line",
          providers: ["line"],
        },
      });

      const createUserErrorText = createUserResult.error
        ? `${createUserResult.error.message || ""} ${createUserResult.error.code || ""}`.toLowerCase()
        : "";
      if (createUserResult.error && (createUserErrorText.includes("already") || createUserErrorText.includes("exists"))) {
        createUserResult = await supabase.auth.admin.createUser({
          email: await buildPseudoEmail(`${lineUserId}:${crypto.randomUUID()}`),
          email_confirm: true,
          user_metadata: {
            display_name: lineDisplayName,
            avatar_url: linePicture,
            provider: "line",
            line_user_id: lineUserId,
          },
          app_metadata: {
            provider: "line",
            providers: ["line"],
          },
        });
      }

      if (createUserResult.error || !createUserResult.data.user) {
        throw createUserResult.error || new Error("LINE user create failed");
      }
      memberId = createUserResult.data.user.id;
    }

    const currentMember = await supabase
      .from("members")
      .select("id,email,display_name,role,status")
      .eq("id", memberId)
      .maybeSingle();

    if (currentMember.error) throw currentMember.error;

    const nextDisplayName = currentMember.data
      && currentMember.data.display_name
      && String(currentMember.data.display_name).trim() !== ""
      && String(currentMember.data.display_name).trim() !== "匿名"
      ? String(currentMember.data.display_name).trim()
      : lineDisplayName;
    const nextEmail = currentMember.data && currentMember.data.email
      ? String(currentMember.data.email)
      : lineEmail;

    const memberUpsert = await supabase
      .from("members")
      .upsert([{
        id: memberId,
        email: nextEmail,
        display_name: nextDisplayName,
      }], { onConflict: "id" })
      .select("id,email,display_name,role,status")
      .maybeSingle();

    if (memberUpsert.error || !memberUpsert.data) {
      throw memberUpsert.error || new Error("member upsert failed");
    }

    const identityUpsert = await supabase
      .from("external_identities")
      .upsert([{
        member_id: memberId,
        provider: "line",
        provider_user_id: lineUserId,
        provider_email: lineEmail,
        provider_display_name: lineDisplayName,
        provider_avatar_url: linePicture,
        provider_payload: claims,
      }], { onConflict: "provider,provider_user_id" });

    if (identityUpsert.error) throw identityUpsert.error;

    const issued = await issueAppJwt({
      memberId,
      email: lineEmail || memberUpsert.data.email || null,
      displayName: memberUpsert.data.display_name || lineDisplayName,
      picture: linePicture,
    });

    return Response.redirect(buildRedirectUrl(returnTo, {
      cl_provider: "line",
      cl_access_token: issued.token,
      cl_expires_at: String(issued.expiresAtMs),
    }), 302);
  } catch (err) {
    console.error("line-login-callback failed:", err);
    return Response.redirect(buildRedirectUrl(returnTo, {
      cl_provider: "line",
      cl_auth_error: "line_login_failed",
      cl_auth_error_description: toSafeMessage(err),
    }), 302);
  }
});
