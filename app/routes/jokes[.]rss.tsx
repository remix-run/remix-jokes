import type { LoaderFunction } from "remix";
import { getUserId } from "~/utils/session.server";
import { gql } from "graphql-request";
import { client } from "~/lib/graphcms";

const GetJokesWithJokster = gql`
  query GetJokesWithJokster($joksterId: ID!) {
    jokes(
      where: { jokester: { id: $joksterId } }
      orderBy: createdAt_DESC
      first: 100
    ) {
      id
      name
      content
      jokester {
        username
      }
    }
  }
`;

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await getUserId(request);

  let { jokes } = await client.request(GetJokesWithJokster, {
    joksterId: userId,
  });

  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");
  if (!host) {
    throw new Error("Could not determine domain URL.");
  }
  const protocol = host.includes("localhost") ? "http" : "https";
  let domain = `${protocol}://${host}`;
  const jokesUrl = `${domain}/jokes`;

  let rssString = `
    <rss xmlns:blogChannel="${jokesUrl}" version="2.0">
      <channel>
        <title>Remix Jokes</title>
        <link>${jokesUrl}</link>
        <description>Some funny jokes</description>
        <language>en-us</language>
        <generator>Kody the Koala</generator>
        <ttl>40</ttl>
        ${jokes
          .map((joke) =>
            `
            <item>
              <title>${joke.name}</title>
              <description>A funny joke called ${joke.name}</description>
              <author>${joke.jokester.username}</author>
              <pubDate>${joke.createdAt}</pubDate>
              <link>${jokesUrl}/${joke.id}</link>
              <guid>${jokesUrl}/${joke.id}</guid>
            </item>
          `.trim()
          )
          .join("\n")}
      </channel>
    </rss>
  `.trim();

  return new Response(rssString, {
    headers: {
      "Cache-Control": `public, max-age=${60 * 10}, s-maxage=${60 * 60 * 24}`,
      "Content-Type": "application/xml",
      "Content-Length": String(Buffer.byteLength(rssString)),
    },
  });
};
