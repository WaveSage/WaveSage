"use client";

interface HowToGuideModalProps {
  onClose: () => void;
}

export function HowToGuideModal({ onClose }: HowToGuideModalProps) {
  return (
    <div
      className="photo-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel photo-modal account-modal howto-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
      >
        <h2 id="howto-title">How to use WaveSage</h2>
        <p className="muted account-modal-lead">
          Quick tour of the three tabs and how Sage coaches from your profile.
        </p>

        <div className="howto-sections">
          <section>
            <h3>Your profile</h3>
            <p>
              WaveSage uses your name, experience, and style preference to score
              conditions for how <em>you</em> surf. Change those anytime from
              the account menu → Edit profile. Set your favorite spot on the
              Spots tab (star / favorite on a break).
            </p>
          </section>

          <section>
            <h3>Sage tab</h3>
            <p>
              Your coach. On load you get a live outlook for your favorite spot
              (or the spot you pick above the chat). Ask about conditions, dawn
              patrol, a clock time (“How’s it at 9am?”), tomorrow, board volume,
              rail design, or where’s best in North County / SoCal. Use the
              quick prompts and submit a condition photo when you’re at the
              beach.
            </p>
          </section>

          <section>
            <h3>Spots tab</h3>
            <p>
              Interactive map and list of Southern California breaks. Tap a pin
              for swell, wind, tide, quality, and the 5-day midday outlook. Set
              a favorite to retune Sage. Refresh reloads regional conditions.
              Open a report photo to jump into User Reports.
            </p>
          </section>

          <section>
            <h3>User Reports tab</h3>
            <p>
              Gallery of accepted condition photos from surfers. Use it to see
              what’s actually breaking at the beach. Tap reports from Spots or
              Sage to land on a highlighted photo here.
            </p>
          </section>

          <section>
            <h3>Tips</h3>
            <ul>
              <li>
                Ask for a session window: dawn patrol, late morning, afternoon,
                evening, or a specific time.
              </li>
              <li>
                Pair a day and a time: “Black’s for dawn patrol tomorrow.”
              </li>
              <li>
                Regional picks: “Best in North County at 2pm” ranks spots for
                your style.
              </li>
              <li>
                Account menu (top right) has your signed-in account, edit
                profile, this guide, and sign out.
              </li>
            </ul>
          </section>
        </div>

        <div className="photo-modal-actions">
          <button type="button" className="account-primary-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
