import Head from 'next/head';
import Link from 'next/link';

const UPDATED = 'November 18, 2026';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms | AdmitsOnly</title>
        <meta name="description" content="The terms for using AdmitsOnly, in plain language." />
      </Head>
      <article className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <p className="note text-xl text-slate-600">in plain language</p>
        <h1 className="mt-1 text-4xl font-bold text-primary">Terms</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated {UPDATED}</p>
        <p className="mt-6 text-lg text-slate-700 leading-relaxed">
          By creating an account or using AdmitsOnly, you agree to these terms. If you are under 18, please read them
          with a parent or guardian.
        </p>

        <div className="mt-10 space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-primary">Who can use AdmitsOnly</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Students must be <strong>13 or older</strong>. If you are under 18, you need a parent or guardian&apos;s permission to use AdmitsOnly, and they should read these terms and our <Link href="/privacy" className="font-semibold underline underline-offset-4">Privacy</Link> notice with you.</li>
              <li>Parent and tutor accounts are for adults <strong>18 or older</strong>.</li>
              <li>Enter your real date of birth. We use it to set protections for younger students, and we may close an account that doesn&apos;t meet these age requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Your account</h2>
            <p className="mt-3">
              Give accurate information, keep your password to yourself, and tell us if you think someone else has used
              your account. You are responsible for what happens under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Your work stays yours</h2>
            <p className="mt-3">
              Essays, notes and everything else you write belong to you. You let us store and process them only to run
              AdmitsOnly for you, for example to show your feedback or share progress with someone you connected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Feedback is guidance, and Adam is an AI</h2>
            <p className="mt-3">
              Scores, suggestions, college fits and deadlines in AdmitsOnly are guidance, not guarantees. Deadlines are the
              dates schools have typically used; always confirm on each school&apos;s own website. No tool, tutor or
              consultant can promise an admission. Adam is an AI: it can be wrong, so check important details with a
              counselor, teacher or parent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Be a good pod-mate</h2>
            <p className="mt-3">
              In Study Pods and community channels, be kind and honest. Don&apos;t harass anyone, share someone else&apos;s
              private information, post anything illegal, or submit someone else&apos;s essay as your own. Messages that
              members report may be hidden, and we may suspend accounts that break these rules.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Paid features</h2>
            <p className="mt-3">
              Some features, such as the full sample essay library and consulting services, are paid. Prices are shown
              before you pay, and payments are processed by PayPal. If you are under 18, a parent or guardian must make
              or approve the purchase. If something you paid for doesn&apos;t work, email us
              and we will make it right.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Ending your account</h2>
            <p className="mt-3">
              You can stop using AdmitsOnly at any time and ask us to delete your account. We may suspend accounts that
              misuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Questions</h2>
            <p className="mt-3">
              Email <a href="mailto:info@admitsonly.com" className="font-semibold underline underline-offset-4">info@admitsonly.com</a>.
              How we handle your information is described in our <Link href="/privacy" className="font-semibold underline underline-offset-4">Privacy</Link> notice.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
