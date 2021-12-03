import { Link, Form } from "remix";

interface Joke {
  id: string;
  name: string;
  content: string;
}

export function JokeDisplay({
  joke,
  isOwner,
  canDelete = true,
}: {
  joke: Pick<Joke, "content" | "name">;
  isOwner: boolean;
  canDelete?: boolean;
}) {
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      <Link to=".">{joke.name} Permalink</Link>
      {isOwner ? (
        <Form method="delete">
          <button type="submit" className="button" disabled={!canDelete}>
            Delete
          </button>
        </Form>
      ) : null}
    </div>
  );
}
