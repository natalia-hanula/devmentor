import Link from "next/link";
import { INVITE_CONTEXT, INVITE_PATH, readNext, redirectSignedIn, withNext, type SearchParams } from "../auth-entry";
import { Notice } from "../notice";
import { RegisterForm } from "./register-form";

/** Przy 409 („Ten e-mail ma już konto”, L19) link „Zaloguj się” jest tuż pod formularzem — zawsze widoczny. */
export async function RegisterContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = readNext(await searchParams);
  await redirectSignedIn(next);

  return (
    <>
      {next === INVITE_PATH && <Notice>{INVITE_CONTEXT}</Notice>}
      <RegisterForm next={next} />
      <p className="text-body">
        Masz konto?{" "}
        <Link href={withNext("/login", next)} className="text-primary underline-offset-4 hover:underline">
          Zaloguj się
        </Link>
      </p>
    </>
  );
}
