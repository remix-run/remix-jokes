import type { LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

type LoaderData = { randomJoke: Joke };

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await getUserId(request);
  const count = userId
    ? await db.joke.count({ where: { jokesterId: userId } })
    : 0;
  let randomRowNumber = Math.floor(Math.random() * count);
  let [randomJoke] =
    count > 0
      ? await db.joke.findMany({
          take: 1,
          skip: randomRowNumber,
        })
      : [];
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
