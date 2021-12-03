import { LoaderFunction, LinksFunction } from "remix";
import { Form } from "remix";
import { Outlet, useLoaderData, Link } from "remix";
import { getUser } from "~/utils/session.server";
import stylesUrl from "../styles/jokes.css";
import { client } from "~/lib/graphcms";
import { gql } from "graphql-request";

type User = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  username: string;
  passwordHash: string;
};

type LoaderData = {
  user: User | null;
  jokeListItems: Array<{ id: string; name: string }>;
};

const GetJokesByUser = gql`
  query GetJokesByUser($userId: ID!) {
    jokes(where: { jokester: { id: $userId } }) {
      id
      name
    }
  }
`;

export let loader: LoaderFunction = async ({ request }) => {
  let user = await getUser(request);

  let { jokes: jokeListItems } = await client.request(GetJokesByUser, {
    userId: user.id,
  });

  let data: LoaderData = {
    jokeListItems,
    user,
  };

  return data;
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export default function JokesScreen() {
  let data = useLoaderData<LoaderData>();

  return (
    <div className="jokes-layout">
      <header className="jokes-header">
        <div className="container">
          <h1 className="home-link">
            <Link to="/" title="Remix Jokes" aria-label="Remix Jokes">
              <span className="logo">🤪</span>
              <span className="logo-medium">J🤪KES</span>
            </Link>
          </h1>
          {data.user ? (
            <div className="user-info">
              <span>{`Hi ${data.user.username}`}</span>
              <Form action="/logout" method="post">
                <button type="submit" className="button">
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>
      <main className="jokes-main">
        <div className="container">
          <div className="jokes-list">
            {data.jokeListItems.length ? (
              <>
                <Link to=".">Get a random joke</Link>
                <p>Here are a few more jokes to check out:</p>
                <ul>
                  {data.jokeListItems.map(({ id, name }) => (
                    <li key={id}>
                      <Link to={id} prefetch="intent">
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to="new" className="button">
                  Add your own
                </Link>
              </>
            ) : null}
          </div>
          <div className="jokes-outlet">
            <Outlet />
          </div>
        </div>
      </main>
      <footer className="jokes-footer">
        <div className="container">
          <Link reloadDocument to="/jokes.rss">
            RSS
          </Link>
        </div>
      </footer>
    </div>
  );
}
