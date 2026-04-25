import type { FacebookPage, Post } from "@prisma/client";

type PublishResult = {
  facebookPostId: string;
};

export async function publishToFacebookPage(post: Post, page: FacebookPage): Promise<PublishResult> {
  if (process.env.PUBLISH_MODE !== "live") {
    return {
      facebookPostId: `mock_${page.facebookPageId}_${post.id}`,
    };
  }

  if (!page.accessTokenHint) {
    throw new Error("Page access token is not configured for live publishing.");
  }

  const graphVersion = process.env.META_GRAPH_VERSION ?? "v25.0";
  const endpoint = `https://graph.facebook.com/${graphVersion}/${page.facebookPageId}/feed`;
  const params = new URLSearchParams({
    message: post.message,
    access_token: page.accessTokenHint,
  });

  if (post.linkUrl) {
    params.set("link", post.linkUrl);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: params,
  });

  const payload = (await response.json()) as { id?: string; error?: { message?: string } };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message ?? "Facebook Graph API publish failed.");
  }

  return {
    facebookPostId: payload.id,
  };
}
