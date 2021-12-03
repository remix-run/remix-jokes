import type { ActionFunction, LoaderFunction } from "remix";
import {
  useActionData,
  redirect,
  useCatch,
  Link,
  useTransition,
  Form,
} from "remix";
import { JokeDisplay } from "~/components/joke";
import { requireUserId, getUserId } from "~/utils/session.server";
import { gql } from "graphql-request";
import { client } from "~/lib/graphcms";

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await getUserId(request);
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return {};
};

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return `That joke is too short`;
  }
}

function validateJokeName(name: string) {
  if (name.length < 2) {
    return `That joke's name is too short`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: { name: string | undefined; content: string | undefined };
  fields?: {
    name: string;
    content: string;
  };
};

const CreateJoke = gql`
  mutation CreateJoke($name: String!, $content: String!, $userId: ID!) {
    createJoke(
      data: {
        name: $name
        content: $content
        jokester: { connect: { id: $userId } }
      }
    ) {
      id
      name
      content
    }
  }
`;

export let action: ActionFunction = async ({
  request,
}): Promise<Response | ActionData> => {
  const userId = await requireUserId(request);

  let { name, content } = Object.fromEntries(await request.formData());
  if (typeof name !== "string" || typeof content !== "string") {
    return { formError: `Form not submitted correctly.` };
  }

  let fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };
  let fields = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return { fieldErrors, fields };
  }

  let { joke } = await client.request(CreateJoke, {
    name,
    content,
    userId,
  });

  return redirect(`/jokes/${joke.id}`);
};

export default function NewJokeRoute() {
  let actionData = useActionData<ActionData | undefined>();
  let transition = useTransition();

  if (transition.submission) {
    let name = transition.submission.formData.get("name");
    let content = transition.submission.formData.get("content");
    if (
      typeof name === "string" &&
      typeof content === "string" &&
      !validateJokeContent(content) &&
      !validateJokeName(name)
    ) {
      return (
        <JokeDisplay
          joke={{ name, content }}
          isOwner={true}
          canDelete={false}
        />
      );
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
        <div>
          <label>
            Name:{" "}
            <input
              type="text"
              defaultValue={actionData?.fields?.name}
              name="name"
              aria-invalid={Boolean(actionData?.fieldErrors?.name)}
              aria-describedby={
                actionData?.fieldErrors?.name ? "name-error" : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.name ? (
            <p className="form-validation-error" role="alert" id="name-error">
              {actionData?.fieldErrors?.name}
            </p>
          ) : null}
        </div>
        <div>
          <label>
            Content:{" "}
            <textarea
              defaultValue={actionData?.fields?.content}
              name="content"
              aria-invalid={Boolean(actionData?.fieldErrors?.content)}
              aria-describedby={
                actionData?.fieldErrors?.content ? "content-error" : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.content ? (
            <p
              className="form-validation-error"
              role="alert"
              id="content-error"
            >
              {actionData?.fieldErrors?.content}
            </p>
          ) : null}
        </div>
        <button type="submit" className="button">
          Add
        </button>
      </Form>
    </div>
  );
}

export function CatchBoundary() {
  let caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
