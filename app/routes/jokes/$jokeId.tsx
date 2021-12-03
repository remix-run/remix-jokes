import type {
  LoaderFunction,
  ActionFunction,
  MetaFunction,
  HeadersFunction,
} from "remix";
import { json, useLoaderData, useCatch, redirect } from "remix";
import { useParams } from "react-router-dom";
import { getUserId, requireUserId } from "~/utils/session.server";
import { JokeDisplay } from "~/components/joke";
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

export let meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

type LoaderData = { joke: Joke; isOwner: boolean };

const GetJokeById = gql`
  query GetJokeById($jokeId: ID!) {
    joke(where: { id: $jokeId }) {
      id
      name
      content
      jokester {
        id
      }
    }
  }
`;

const DeleteJokeById = gql`
  mutation DeleteJokeById($jokeId: ID!) {
    deleteJoke(where: { id: $jokeId }) {
      id
    }
  }
`;

export let loader: LoaderFunction = async ({ request, params }) => {
  let userId = await getUserId(request);

  let { joke } = await client.request(GetJokeById, {
    jokeId: params.jokeId,
  });

  if (!joke) {
    throw new Response("What a joke! Not found.", { status: 404 });
  }

  if (joke.jokester.id !== userId) {
    throw new Response("What a joke! Not found.", { status: 404 });
  }

  let data: LoaderData = { joke, isOwner: userId === joke.jokester.id };
  return json(data, {
    headers: {
      "Cache-Control": `public, max-age=${60 * 5}, s-maxage=${60 * 60 * 24}`,
      Vary: "Cookie",
    },
  });
};

export let headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
    Vary: loaderHeaders.get("Vary") ?? "",
  };
};

export let action: ActionFunction = async ({ request, params }) => {
  if (request.method === "DELETE") {
    let userId = await requireUserId(request);
    let { joke } = await client.request(GetJokeById, {
      jokeId: params.jokeId,
    });
    if (!joke) {
      throw new Response("Can't delete what does not exist", { status: 404 });
    }
    if (joke.jokester.id !== userId) {
      throw new Response("Pssh, nice try. That's not your joke", {
        status: 401,
      });
    }
    await client.request(DeleteJokeById, { jokeId: params.jokeId });
    return redirect("/jokes");
  }
};

export default function JokeRoute() {
  let data = useLoaderData<LoaderData>();

  return <JokeDisplay joke={data.joke} isOwner={data.isOwner} />;
}

export function CatchBoundary() {
  let caught = useCatch();
  let params = useParams();
  switch (caught.status) {
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  let { jokeId } = useParams();
  return (
    <div>{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
