import Head from 'next/head';
import Link from 'next/link';

/* Plain-language privacy notice. Written to match what the code does
   (see lib/email.ts, lib/ai.ts, lib/paypal.ts, app/api/subscribe, lib/analytics.ts).
   If a feature changes what is collected or who receives it, update this page. */

const UPDATED = 'November 15, 2026';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy | AdmitsOnly</title>
        <meta name="description" content="What AdmitsOnly collects, why, who helps us run the service, and how to have your data deleted." />
      </Head>
      <article className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <p className="note text-xl text-slate-600">the short version</p>
        <h1 className="mt-1 text-4xl font-bold text-primary">Privacy</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated {UPDATED}</p>
        <p className="mt-6 text-lg text-slate-700 leading-relaxed">
          AdmitsOnly is a notebook for high school students, with a place for the parents and tutors they invite.
          We collect what the notebook needs to work, we never sell it, and you can ask us to delete it.
        </p>

        <div className="mt-10 space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-primary">What we collect</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li><strong>Your account:</strong> name, email address, a scrambled (hashed) copy of your password, and whether you are a student, parent or tutor.</li>
              <li><strong>What you put in your notebook:</strong> grades and test scores, activities, essays and drafts, college lists, deadlines and notes, Study Pod messages and files.</li>
              <li><strong>For tutors:</strong> students on your roster, sessions, lesson notes, reviews and earnings you record.</li>
              <li><strong>How the site is used:</strong> pages visited, buttons used and time spent, so we can tell what works. When you are signed in, this is linked to your account.</li>
              <li><strong>If you subscribe to the newsletter:</strong> name, email, region and district, and a phone number only if you choose to give one.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Who can see your work</h2>
            <p className="mt-3">
              Only you, unless you connect a parent or tutor. A connected parent or tutor can see the progress you share
              with them, and you can remove a connection at any time from your profile. Study Pod messages are visible
              to the pod&apos;s members; community channels are visible to every student.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Services that help us run AdmitsOnly</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li><strong>Vercel</strong> hosts the website and its database.</li>
              <li><strong>Anthropic</strong> powers the AI features, such as Adam and AI essay feedback. When you use one, the text you send it (and the parts of your notebook it needs to answer) goes to Anthropic to produce a reply.</li>
              <li><strong>Resend</strong> sends our emails, such as deadline reminders and password resets.</li>
              <li><strong>Beehiiv</strong> runs the newsletter.</li>
              <li><strong>PayPal</strong> handles payments. We never see or store your card details.</li>
            </ul>
            <p className="mt-3">These services handle data only to provide their part of AdmitsOnly. We do not sell personal information, and we do not show ads.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Emails</h2>
            <p className="mt-3">
              We send a few useful emails, such as a reminder before a deadline. Every one has a link to change what you
              get, and you can turn them off in Settings. Account emails, like password resets, always send.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Students under 18</h2>
            <p className="mt-3">
              AdmitsOnly is made for students in grades 9 to 12. It is not intended for children under 13, and we do not
              knowingly collect information from them. If you believe a child under 13 has signed up, tell us and we will
              delete the account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Your choices</h2>
            <p className="mt-3">
              You can update most of your information yourself in the app. To get a copy of your data or have your
              account and everything in it deleted, email{' '}
              <a href="mailto:info@admitsonly.com" className="font-semibold underline underline-offset-4">info@admitsonly.com</a>{' '}
              from the address on your account. California residents have additional rights under the CCPA, including
              the right to know, delete and correct, and we honor them for everyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary">Changes</h2>
            <p className="mt-3">
              If we change how we handle your information, we will update this page and the date above. For significant
              changes, we will tell signed-up users by email. See also our <Link href="/terms" className="font-semibold underline underline-offset-4">Terms</Link>.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
