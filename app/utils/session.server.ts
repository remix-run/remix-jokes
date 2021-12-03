require("dotenv").config();

import bcrypt from "bcrypt";
import { createCookieSessionStorage, redirect } from "remix";
import { gql } from "graphql-request";
import { client } from "~/lib/graphcms";

export const FindByUsername = gql`
  query FindByUsername($username: String!) {
    user: remixUser(where: { username: $username }) {
      id
      username
      passwordHash
    }
  }
`;

const RegisterMutation = gql`
  mutation Register($username: String!, $password: String!) {
    user: createRemixUser(
      data: { username: $username, passwordHash: $password }
    ) {
      id
    }
  }
`;

const GetUserById = gql`
  query GetUserById($id: ID!) {
    user: remixUser(where: { id: $id }) {
      id
      username
    }
  }
`;

type LoginForm = {
  username: string;
  password: string;
};

export async function register({ username, password }: LoginForm) {
  let passwordHash = await bcrypt.hash(password, 10);
  const { user } = await client.request(RegisterMutation, {
    username,
    password: passwordHash,
  });
  return user;
}

export async function login({ username, password }: LoginForm) {
  const { user } = await client.request(FindByUsername, { username });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isCorrectPassword) return null;
  return user;
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

let { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secure: true,
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export function getUserSession(request: Request) {
  return getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  let session = await getUserSession(request);
  let userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(request: Request) {
  let session = await getUserSession(request);
  let userId = session.get("userId");
  if (!userId || typeof userId !== "string") throw redirect("/login");
  return userId;
}

export async function getUser(request: Request) {
  let userId = await getUserId(request);
  if (typeof userId !== "string") return null;

  try {
    let { user } = await client.request(GetUserById, { id: userId });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  let session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}

export async function createUserSession(userId: string, redirectTo: string) {
  let session = await getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
