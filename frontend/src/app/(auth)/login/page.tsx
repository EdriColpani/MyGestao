import { LoginForm } from "./LoginForm";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <LoginForm redirectTo={safeNext(sp.next)} />;
}
