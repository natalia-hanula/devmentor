/* Ekrany publiczne (auth): s01, s02, s03 [B], s05, s06 [B], s07 [B], s08. */
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { Button, buttonVariants } from "@devmentor/ui/components/ui/button";
import { AuthForm } from "../gaps/auth-form";
import { AuthLayout } from "../gaps/auth-layout";
import { Notice } from "../gaps/notice";
import { OrSeparator } from "../gaps/or-separator";
import { RouteLink } from "../gaps/route-link";
import { SimNote, StageB } from "../gaps/sim-note";
import { loginSchema, registerSchema } from "../sim/schemas";
import {
  acceptInvitation,
  homeRoute,
  login,
  register,
  resendVerification,
  sessionAccount,
  useSim,
} from "../sim/store";
import { PendingState } from "./pending-state";

const PASSWORD_NOTE = (
  <SimNote>
    hasło nie jest nigdzie wysyłane ani zapisywane. Konta demo logują się hasłem <code className="font-code">demo-haslo-12</code>;
    każde inne daje błąd. Nie wpisuj prawdziwego hasła.
  </SimNote>
);

const INVITE_CONTEXT = "Po zalogowaniu przyjmiesz zaproszenie do roli mentora.";

// LUKA DS04: przycisk OAuth jako link <a> (pełna nawigacja, spec E01) — buttonVariants na <a>.
// Ikony GitHuba nie ma w lucide-react 1.x (usunięte znaki marek), więc sam tekst.
function GithubLink({ next }: { next?: string }) {
  return (
    <RouteLink to="/github" params={next ? { next } : undefined} className={buttonVariants({ variant: "outline", className: "w-full" })}>
      Kontynuuj z GitHubem
      <StageB />
    </RouteLink>
  );
}

function withNext(path: string, next: string | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function RegisterScreen() {
  const sim = useSim();
  const view = sim.views.s01;
  const next = view.params.next;
  return (
    <AuthLayout title="Załóż konto">
      {view.state === "s01.11" && <Notice title={INVITE_CONTEXT} />}
      <GithubLink next={next} />
      <OrSeparator />
      <AuthForm
        key={`${sim.resetCount}-${view.nonce}`}
        fields={[
          { name: "displayName", label: "Wyświetlana nazwa", type: "text", autoComplete: "nickname" },
          { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Hasło", type: "password", autoComplete: "new-password", description: "Min. 12 znaków" },
        ]}
        schema={registerSchema}
        submitLabel="Załóż konto"
        submittingLabel="Zakładanie konta…"
        formErrorTitle="Nie udało się założyć konta"
        forcedSubmitting={view.state === "s01.4"}
        onSubmit={(values) => register(values.displayName, values.email, values.password, next)}
      >
        {PASSWORD_NOTE}
      </AuthForm>
      <p className="text-body">
        Masz konto? <RouteLink to={withNext("/login", next)}>Zaloguj się</RouteLink>
      </p>
    </AuthLayout>
  );
}

export function LoginScreen() {
  const sim = useSim();
  const view = sim.views.s02;
  const next = view.params.next;
  return (
    <AuthLayout title="Zaloguj się">
      {view.state === "s02.13" && <Notice tone="success" title="Wylogowano" />}
      {view.state === "s02.11" && <Notice title={INVITE_CONTEXT} />}
      <GithubLink next={next} />
      <OrSeparator />
      <AuthForm
        key={`${sim.resetCount}-${view.nonce}`}
        fields={[
          { name: "email", label: "E-mail", type: "email", autoComplete: "username" },
          { name: "password", label: "Hasło", type: "password", autoComplete: "current-password" },
        ]}
        schema={loginSchema}
        initialValues={{ email: view.params.email }}
        submitLabel="Zaloguj się"
        submittingLabel="Logowanie…"
        formErrorTitle="Nie udało się zalogować"
        forcedSubmitting={view.state === "s02.3"}
        onSubmit={(values) => login(values.email, values.password, next)}
      >
        {PASSWORD_NOTE}
      </AuthForm>
      <div className="flex flex-col gap-in-group text-body">
        <p>
          <RouteLink to="/forgot-password">Nie pamiętasz hasła?</RouteLink>
          <StageB />
        </p>
        <p>
          Nie masz konta? <RouteLink to={withNext("/register", next)}>Załóż konto</RouteLink>
        </p>
      </div>
    </AuthLayout>
  );
}

export function GithubScreen() {
  return (
    <div className="flex flex-col gap-between-groups px-panel py-section">
      <h1 className="text-page-title">GitHub — autoryzacja (symulacja usługi zewnętrznej)<StageB /></h1>
      <SimNote>ten ekran zastępuje stronę GitHuba i nie jest częścią produktu. Nic nie łączy się z GitHubem.</SimNote>
      <PendingState stateId="s03.1–s03.3" />
      <p className="text-body">
        <RouteLink to="/login">Wróć do logowania</RouteLink>
      </p>
    </div>
  );
}

export function VerifyEmailScreen() {
  const sim = useSim();
  const view = sim.views.s05;
  const account = sessionAccount(sim);
  const toAccount = account && (
    <RouteLink to={homeRoute(account)} className={buttonVariants()}>
      Przejdź do konta
    </RouteLink>
  );
  return (
    <AuthLayout title="Potwierdzenie adresu e-mail">
      {view.state === "s05.1" && <LoadingMessage label="Potwierdzanie adresu…" />}
      {view.state === "s05.2" && (
        <Notice
          tone="success"
          title="Adres e-mail potwierdzony"
          action={toAccount ?? <RouteLink to="/login" className={buttonVariants()}>Zaloguj się</RouteLink>}
        />
      )}
      {view.state === "s05.8" && (
        <Notice
          tone="success"
          title={`Potwierdzono adres ${view.params.confirmedEmail}.`}
          action={toAccount}
        >
          To inne konto niż to, które jest teraz zalogowane.
        </Notice>
      )}
      {view.state === "s05.4" && <Notice tone="success" title="Twój adres jest już potwierdzony" action={toAccount} />}
      {(view.state === "s05.3" || view.state === "s05.5") && (
        <Notice
          tone="error"
          title="Link jest nieważny albo wygasł"
          action={
            account && !account.emailVerified ? (
              <Button variant="outline" size="sm" onClick={() => void resendVerification("s05")} disabled={view.params.resend === "sending"}>
                {view.params.resend === "sending" ? "Wysyłanie…" : "Wyślij ponownie"}
              </Button>
            ) : account ? (
              toAccount
            ) : (
              // LUKA DS21: Button ma whitespace-nowrap i stałą wysokość — długa etykieta wychodzi poza wąski ekran.
              <RouteLink to="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "h-auto whitespace-normal" })}>
                Zaloguj się, aby wysłać nowy link
              </RouteLink>
            )
          }
        >
          {view.params.resend === "sent" && `Wysłaliśmy nowy link na adres ${account?.email}. (tekst: propozycja, L12)`}
        </Notice>
      )}
      {(view.state === "s05.6" || view.state === "s05.7") && <PendingState stateId={view.state} />}
      <SimNote>link pochodzi ze skrzynki deweloperskiej (s12); token jest częścią adresu po „#”, nic nie jest wysyłane do sieci.</SimNote>
    </AuthLayout>
  );
}

export function ForgotPasswordScreen() {
  return (
    <AuthLayout title="Nie pamiętasz hasła?">
      <PendingState stateId="s06.1–s06.7 [etap B]" />
      <p className="text-body">
        <RouteLink to="/login">Wróć do logowania</RouteLink>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordScreen() {
  return (
    <AuthLayout title="Ustaw nowe hasło">
      <PendingState stateId="s07.1–s07.7 [etap B]" />
      <p className="text-body">
        <RouteLink to="/login">Wróć do logowania</RouteLink>
      </p>
    </AuthLayout>
  );
}

const INVITE_TEXT = "Masz zaproszenie do roli mentora w DevMentor.";

export function InviteScreen() {
  const sim = useSim();
  const view = sim.views.s08;
  const account = sessionAccount(sim);
  return (
    <AuthLayout title="Zaproszenie do roli mentora">
      {view.state === "s08.1" && (
        <>
          <p className="text-body-public">{INVITE_TEXT} Zaloguj się lub załóż konto, aby je przyjąć.</p>
          <div className="flex flex-wrap gap-in-group">
            <RouteLink to="/login?next=%2Finvite" className={buttonVariants()}>Zaloguj się</RouteLink>
            <RouteLink to="/register?next=%2Finvite" className={buttonVariants({ variant: "outline" })}>Załóż konto</RouteLink>
          </div>
        </>
      )}
      {(view.state === "s08.2" || view.state === "s08.3") && (
        <>
          <p className="text-body-public">{INVITE_TEXT}</p>
          <p className="text-body text-muted-foreground">
            Rolę mentora dostanie konto {account?.email}. (tekst: propozycja)
          </p>
          <div>
            <Button onClick={() => void acceptInvitation()} disabled={view.state === "s08.3"}>
              {view.state === "s08.3" ? "Przyjmowanie…" : "Przyjmij zaproszenie"}
            </Button>
          </div>
          {view.state === "s08.3" && <LoadingMessage label="Przyjmowanie zaproszenia…" />}
        </>
      )}
      {view.state === "s08.5" && (
        <Notice
          tone="success"
          title="Masz już rolę mentora"
          action={<RouteLink to="/mentor" className={buttonVariants()}>Przejdź do panelu mentora</RouteLink>}
        />
      )}
      {view.state === "s08.6" && (
        <Notice tone="error" title="Zaproszenie jest nieważne">
          Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.
        </Notice>
      )}
      {view.state === "s08.8" && <Notice tone="error" title="Link jest nieważny albo wygasł" />}
      {(view.state === "s08.7" || view.state === "s08.9") && <PendingState stateId={view.state} />}
      <SimNote>
        token zaproszenia trzymamy w symulowanym <code className="font-code">sessionStorage</code> (w pamięci karty), nigdy w{" "}
        <code className="font-code">next</code>.
      </SimNote>
    </AuthLayout>
  );
}
