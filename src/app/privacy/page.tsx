import type { Metadata } from "next";
import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

export const metadata: Metadata = {
  title: "Privacy Policy · WaveSage",
  description:
    "How WaveSage collects, uses, and protects personal information for the web and mobile apps.",
};

const EFFECTIVE_DATE = "August 21, 2026";
const CONTACT_EMAIL = "privacy@wavesage.app";
const SITE_URL = "https://wavesage.app";

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <AppLogo height={56} asHeading alt="WaveSage" />
        </Link>
        <nav className="legal-nav" aria-label="Legal navigation">
          <Link href="/">Home</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Sign up</Link>
        </nav>
      </header>

      <article className="legal-doc panel">
        <h1>Privacy Policy</h1>
        <p className="legal-meta">
          Effective date: <strong>{EFFECTIVE_DATE}</strong>
          <br />
          Applies to: WaveSage website ({SITE_URL}) and the WaveSage iOS and
          Android applications (the “App,” “Service,” “we,” “us,” or “our”).
        </p>

        <p>
          This Privacy Policy explains what information WaveSage collects, how we
          use it, and the choices you have. By using WaveSage, you agree to this
          Policy. If you do not agree, please do not use the Service.
        </p>
        <p className="muted">
          This document is provided to help you understand our practices and to
          support App Store / Google Play disclosure requirements. It is not
          legal advice. You should review it with counsel before relying on it
          for a commercial launch.
        </p>

        <h2>1. Who we are</h2>
        <p>
          WaveSage provides surf conditions, style-based outlook, and optional
          user-submitted condition photos for Southern California surf spots.
          The Service is operated from the United States and hosted on
          third-party cloud infrastructure.
        </p>
        <p>
          Privacy contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <h2>2. Information we collect</h2>

        <h3>2.1 Account information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Username</li>
          <li>Password (stored only as a secure one-way hash; we cannot read your password)</li>
          <li>Name</li>
          <li>Age</li>
          <li>Experience level and surfing style preference</li>
          <li>Favorite surf spot(s) and quick-spot selections you choose</li>
        </ul>

        <h3>2.2 Session and authentication data</h3>
        <ul>
          <li>
            An HTTP-only session cookie (<code>wavesage-session</code>) used to
            keep you signed in
          </li>
          <li>
            Optional password-reset tokens (time-limited) when you request a
            password reset
          </li>
          <li>Optional email-verification tokens when account verification is used</li>
        </ul>

        <h3>2.3 Precise location (User Wave Reports)</h3>
        <p>
          If you submit a <strong>User Wave Report</strong> (photo of
          conditions), the App requests <strong>precise location</strong> from
          your device so we can confirm you are near the selected surf spot
          (approximately within 2 miles / 3.2 km). We may also read location
          metadata embedded in the photo (EXIF) when available.
        </p>
        <p>
          Location for reports is collected <strong>only when you choose to
          submit a report</strong>, not continuously in the background for
          tracking.
        </p>
        <p>
          Guests who are not signed in cannot submit reports. Guest browsing of
          the User Reports gallery is limited to publicly accepted reports for
          Lower Trestles.
        </p>

        <h3>2.4 Photos and captions</h3>
        <p>When you submit a User Wave Report, we collect:</p>
        <ul>
          <li>The photo you upload (JPEG/PNG)</li>
          <li>An optional caption (limited length)</li>
          <li>
            Related metadata needed for validation (submission time, distance
            to spot, basic image-content confidence signals, and moderation
            notes)
          </li>
        </ul>
        <p>
          Accepted reports may be shown to other users in the App (for example,
          on the User Reports tab or near spot conditions).
        </p>

        <h3>2.5 App usage and device information</h3>
        <ul>
          <li>
            Basic technical information needed to operate the Service (such as
            IP address as processed by our hosting provider, browser or app
            type, and request logs)
          </li>
          <li>
            Optional in-app feedback about Sage responses (for example thumbs
            up/down, optional short comments, and related message context used
            for product improvement)
          </li>
          <li>
            Limited on-device storage (for example, a “last check” snapshot for
            a spot stored in your browser/app local storage so we can show
            changes since your previous visit)
          </li>
        </ul>

        <h3>2.6 Information from guests (not signed in)</h3>
        <p>If you browse without an account, we may still process:</p>
        <ul>
          <li>
            Requests needed to show public preview content (for example Lower
            Trestles outlook and regional live spot conditions)
          </li>
          <li>Standard hosting/server logs as described above</li>
        </ul>
        <p>Guests cannot submit User Wave Reports or set account favorites.</p>

        <h2>3. How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>Create and manage your account and keep you signed in</li>
          <li>
            Personalize surf outlook and recommendations based on your style
            and favorite spots
          </li>
          <li>
            Validate User Wave Reports (including proximity to the break) and
            display accepted reports
          </li>
          <li>Provide password reset and account support</li>
          <li>Improve product quality, reliability, and safety/moderation</li>
          <li>Protect against abuse, fraud, and unauthorized access</li>
          <li>Comply with law and enforce our terms</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information. We do not
          use your precise location to build advertising profiles or to track
          you across other companies’ apps/websites for ads.
        </p>

        <h2>4. Mobile app permissions</h2>
        <p>
          On iOS and Android, WaveSage may request permissions only when needed
          for features you use:
        </p>
        <ul>
          <li>
            <strong>Location (when submitting a User Wave Report):</strong> to
            verify you are at or near the selected spot
          </li>
          <li>
            <strong>Camera / photo library (when submitting a report):</strong>{" "}
            to capture or select a conditions photo
          </li>
          <li>
            <strong>Network access:</strong> to load conditions, accounts, and
            reports from our servers
          </li>
        </ul>
        <p>
          You can deny permissions in device settings; some features (especially
          User Wave Reports) will not work without them.
        </p>

        <h2>5. Cookies and similar technologies</h2>
        <p>
          We use an essential session cookie to authenticate signed-in users.
          This cookie is required for account features and is not used for
          third-party advertising. We may also use local storage on your device
          for small convenience features described above.
        </p>

        <h2>6. Third-party services</h2>
        <p>
          We use trusted processors and data sources to operate WaveSage,
          including:
        </p>
        <ul>
          <li>
            <strong>Hosting / infrastructure</strong> (for example Render or
            similar providers) to run the App and store account and report data
          </li>
          <li>
            <strong>Marine / weather / tide data providers</strong> (for
            example Open-Meteo and NOAA) to generate conditions and forecasts.
            These providers receive location coordinates for the surf spot being
            queried, not your name or password.
          </li>
          <li>
            <strong>Optional AI providers</strong> (for example OpenAI), if
            enabled, to help generate certain Sage responses. Content needed for
            the reply may be sent to the provider under their terms and our
            configuration.
          </li>
          <li>
            <strong>Optional email delivery</strong> (for example Resend), if
            enabled, to send password-reset or verification emails.
          </li>
        </ul>
        <p>
          These providers process data only as needed to provide their services
          to us. Their own privacy policies apply to their processing.
        </p>

        <h2>7. How we share information</h2>
        <p>We may share information:</p>
        <ul>
          <li>
            With other users, when you submit an accepted User Wave Report
            (photo, caption, spot, and related display metadata)
          </li>
          <li>With service providers who help us host and operate the App</li>
          <li>
            If required by law, legal process, or to protect rights, safety, and
            security
          </li>
          <li>
            In connection with a merger, acquisition, or asset transfer, subject
            to appropriate protections
          </li>
        </ul>
        <p>We do not sell personal information to data brokers.</p>

        <h2>8. Data retention</h2>
        <ul>
          <li>
            Account data is retained while your account remains active and for a
            reasonable period afterward if needed for security, backups, or
            legal obligations
          </li>
          <li>
            User Wave Reports may remain visible while accepted and not deleted;
            you may delete your own reports in the App where that control is
            available
          </li>
          <li>
            Password-reset tokens expire automatically (about one hour) and are
            cleared when used
          </li>
          <li>
            Server logs are retained for a limited operational period by our
            hosting environment
          </li>
        </ul>

        <h2>9. Security</h2>
        <p>
          We use industry-standard measures appropriate to our size and risk
          profile, including password hashing, HTTPS in production, and
          restricted session cookies. No method of transmission or storage is
          100% secure. Please use a strong unique password and protect your
          device.
        </p>

        <h2>10. Children’s privacy</h2>
        <p>
          WaveSage is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13. If you believe a
          child under 13 has created an account, contact us and we will take
          steps to delete the information.
        </p>

        <h2>11. Your choices and rights</h2>
        <p>Depending on where you live, you may have rights to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate information (including via Edit profile)</li>
          <li>Delete your account or certain content (such as your reports)</li>
          <li>Withdraw consent for optional features (for example location/camera)</li>
        </ul>
        <p>
          To request access or deletion of your account data, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email
          address on your account. We may need to verify your identity before
          fulfilling a request.
        </p>
        <p>
          California residents: we do not sell or share personal information for
          cross-context behavioral advertising as those terms are commonly
          defined under the CCPA/CPRA. You may still contact us to exercise
          applicable rights.
        </p>

        <h2>12. International users</h2>
        <p>
          WaveSage is operated in the United States. If you use the Service from
          another country, your information may be processed in the United
          States, where laws may differ from those in your jurisdiction.
        </p>

        <h2>13. Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the
          updated version on this page and revise the effective date. Continued
          use of WaveSage after changes become effective constitutes acceptance
          of the updated Policy.
        </p>

        <h2>14. Contact us</h2>
        <p>
          Questions about privacy or this Policy:
          <br />
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <br />
          Website: <a href={SITE_URL}>{SITE_URL}</a>
        </p>

        <p className="legal-back">
          <Link href="/">← Back to WaveSage</Link>
        </p>
      </article>
    </main>
  );
}
