import Link from "next/link";
import { loginNoticeText } from "../../_lib/login-path";
import { INVITE_CONTEXT, INVITE_PATH, readNext, redirectSignedIn, searchParam, withNext, type SearchParams } from "../auth-entry";
import { Notice } from "../notice";
import { LoginForm } from "./login-form";

export async function LoginContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = readNext(params);
  await redirectSignedIn(next);
  const notice = searchParam(params, "notice");
  const noticeText = loginNoticeText(notice);

  return (
    <>
      {noticeText && <Notice tone={notice === "logged_out" ? "success" : "info"}>{noticeText}</Notice>}
      {next === INVITE_PATH && <Notice>{INVITE_CONTEXT}</Notice>}
      <LoginForm next={next} />
      <p className="text-body">
        Nie masz konta?{" "}
        <Link href={withNext("/register", next)} className="text-primary underline-offset-4 hover:underline">
          Załóż konto
        </Link>
      </p>
    </>
  );
}
