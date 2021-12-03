import type { LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import { getUserId } from "~/utils/session.server";
import { client } from "~/lib/graphcms";
import { gql } from "graphql-request";

type Jokster = {
  id: string;
};

type Joke = {
  id: string;
  name: string;
  content: string;
  jokester: Jokster;
};

type LoaderData = { randomJoke: Joke };

const GetAllJokesByUser = gql`
  query GetAllJokesByUser($userId: ID!) {
    jokes(where: { jokester: { id: $userId } }) {
      id
      name
      content
    }
  }
`;

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await getUserId(request);

  // this isn't how you should do it, but the proper way was not working
  // in production... I think it's fly's fault actually...

  let { jokes } = await client.request(GetAllJokesByUser, { userId });

  let randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

  // Here's the proper way:
  /*
  const count = userId
    ? await db.joke.count({ where: { jokesterId: userId } })
    : 0;
  let randomRowNumber = Math.floor(Math.random() * count);
  let [randomJoke] =
    count > 0 && userId
      ? await db.joke.findMany({
          take: 1,
          skip: randomRowNumber,
          where: { jokesterId: userId },
        })
      : [];
  */

  if (!randomJoke) {
    throw new Response("No random joke found", { status: 404 });
  }
  let data: LoaderData = { randomJoke };
  return data;
};

export default function JokesIndexRoute() {
  let data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.randomJoke.content}</p>
      <Link to={data.randomJoke.id}>"{data.randomJoke.name}" Permalink</Link>
    </div>
  );
}

export function CatchBoundary() {
  let caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">
        <p>There are no jokes to display.</p>
        <Link to="new">Add your own</Link>
      </div>
    );
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return <div className="error-container">I did a whoopsies.</div>;
}
