"use client";

import { Suspense, useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import s from "./newsletter.module.css";

export default function NewsletterPage() {
  return (
    <Suspense>
      <NewsletterForm />
    </Suspense>
  );
}

function NewsletterForm() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [district, setDistrict] = useState("");
  const [interest, setInterest] = useState("");
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [consentSMS, setConsentSMS] = useState(false);

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!firstName.trim()) errs.firstName = "Please enter your first name.";
    if (!lastName.trim()) errs.lastName = "Please enter your last name.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      errs.email = "Please enter a valid email address.";

    if (phone.trim()) {
      const phoneRegex =
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(phone.trim().replace(/\s/g, "")))
        errs.phone = "Please enter a valid phone number.";
    }

    if (!grade) errs.grade = "Please select a grade.";
    if (!district) errs.district = "Please select your district.";
    if (!interest) errs.interest = "Please select an interest.";
    if (!consentEmail)
      errs.consentEmail =
        "You must agree to receive the newsletter to subscribe.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const data = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      grade,
      district,
      interest,
      consentNewsletter: consentEmail,
      consentContact,
      consentSMS,
      timestamp: new Date().toISOString(),
      source: typeof window !== "undefined" ? window.location.href : "",
    };

    // ── INTEGRATION POINT ──
    // Replace the setTimeout below with your actual API call once you have a backend:
    //
    // Option A — Beehiiv API:
    // fetch('https://api.beehiiv.com/v2/publications/YOUR_PUB_ID/subscriptions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
    //   body: JSON.stringify({ email: data.email, utm_source: 'website_form', custom_fields: [{ name: 'first_name', value: data.firstName }, { name: 'grade', value: data.grade }] })
    // })
    //
    // Option B — Mailchimp:
    // POST to your Mailchimp list endpoint with merge fields
    //
    // For now: simulates a successful submission and shows the thank-you screen
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      console.log("Form submitted:", data);
    }, 1000);
  }

  return (
    <div className={s.body}>
      <div className={s.pageWrapper}>
        {/* ══════════════════════════════ */}
        {/* LEFT PANEL — BRAND + BENEFITS */}
        {/* ══════════════════════════════ */}
        <div className={s.leftPanel}>
          <div className={s.leftGlow} />
          <div className={s.leftGlow2} />

          <div>
            <div className={s.accentBar} />
            <div className={s.leftEyebrow}>Free Weekly Newsletter</div>
            <div className={s.leftTitle}>
              Learner&rsquo;s <span className={s.leftTitleGold}>Edge</span>{" "}
              Weekly
            </div>
            <div className={s.leftTagline}>
              The Bay Area&rsquo;s most useful education newsletter —
              internships, volunteer events, college insights, and EdTech news,
              every week. Free forever.
            </div>

            <ul className={s.benefits}>
              <li className={s.benefitItem}>
                <div className={`${s.benefitIcon} ${s.biGold}`}>
                  <span role="img" aria-label="Graduation cap">
                    🎓
                  </span>
                </div>
                <div className={s.benefitText}>
                  <div className={s.benefitTitle}>
                    Real Bay Area Internships
                  </div>
                  <div className={s.benefitDesc}>
                    Paid opportunities at Berkeley Lab, Stanford, UCSF — sourced
                    weekly with live deadlines
                  </div>
                </div>
              </li>
              <li className={s.benefitItem}>
                <div className={`${s.benefitIcon} ${s.biTeal}`}>
                  <span role="img" aria-label="Handshake">
                    🤝
                  </span>
                </div>
                <div className={s.benefitText}>
                  <div className={s.benefitTitle}>
                    Volunteer &amp; Community Events
                  </div>
                  <div className={s.benefitDesc}>
                    Fresh from Eventbrite and HandsOn Bay Area every week —
                    events that matter for admissions
                  </div>
                </div>
              </li>
              <li className={s.benefitItem}>
                <div className={`${s.benefitIcon} ${s.biViolet}`}>
                  <span role="img" aria-label="Mobile phone">
                    📱
                  </span>
                </div>
                <div className={s.benefitText}>
                  <div className={s.benefitTitle}>
                    EdTech That Actually Works
                  </div>
                  <div className={s.benefitDesc}>
                    Vetted tools and certifications for every grade level — with
                    honest guidance on what helps
                  </div>
                </div>
              </li>
              <li className={s.benefitItem}>
                <div className={`${s.benefitIcon} ${s.biCoral}`}>
                  <span role="img" aria-label="Classical building">
                    🏛️
                  </span>
                </div>
                <div className={s.benefitText}>
                  <div className={s.benefitTitle}>
                    College Admissions Intelligence
                  </div>
                  <div className={s.benefitDesc}>
                    Data, deadlines, and strategy — written for Bay Area
                    families navigating UC, CSU, and beyond
                  </div>
                </div>
              </li>
              <li className={s.benefitItem}>
                <div className={`${s.benefitIcon} ${s.biGreen}`}>
                  <span role="img" aria-label="Star">
                    🌟
                  </span>
                </div>
                <div className={s.benefitText}>
                  <div className={s.benefitTitle}>K–12 Cohort Sections</div>
                  <div className={s.benefitDesc}>
                    Elementary, Middle, and High School sections — skip to what
                    matters for your family
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className={s.socialProof}>
            <div className={s.spAvatars}>
              <div className={s.spAvatar} style={{ background: "#1a9e8f" }}>
                M
              </div>
              <div className={s.spAvatar} style={{ background: "#6b48a0" }}>
                K
              </div>
              <div
                className={s.spAvatar}
                style={{ background: "#e8a838", color: "#1a1a2e" }}
              >
                J
              </div>
              <div className={s.spAvatar} style={{ background: "#e05c3a" }}>
                R
              </div>
            </div>
            <div className={s.spText}>
              <strong className={s.spTextStrong}>
                Join Bay Area families
              </strong>{" "}
              getting the most useful education newsletter in the region — free
              every week.
            </div>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* RIGHT PANEL — FORM            */}
        {/* ══════════════════════════════ */}
        <div className={s.rightPanel}>
          {!submitted ? (
            <div>
              <div className={s.formEyebrow}>
                Get Started — It&rsquo;s Free
              </div>
              <div className={s.formTitle}>
                Subscribe &amp; Join Our Community
              </div>
              <div className={s.formSubtitle}>
                We&rsquo;ll send your first issue this week. Unsubscribe anytime
                — no questions asked.
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Name Row */}
                <div className={s.formRow}>
                  <div className={s.formGroupHalf}>
                    <label className={s.label} htmlFor="firstName">
                      First Name <span className={s.required}>*</span>
                    </label>
                    <input
                      className={`${s.input} ${errors.firstName ? s.inputError : ""}`}
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="Jane"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearError("firstName");
                      }}
                    />
                    <div
                      className={
                        errors.firstName
                          ? s.fieldErrorVisible
                          : s.fieldError
                      }
                    >
                      {errors.firstName}
                    </div>
                  </div>
                  <div className={s.formGroupHalf}>
                    <label className={s.label} htmlFor="lastName">
                      Last Name <span className={s.required}>*</span>
                    </label>
                    <input
                      className={`${s.input} ${errors.lastName ? s.inputError : ""}`}
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="Smith"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearError("lastName");
                      }}
                    />
                    <div
                      className={
                        errors.lastName
                          ? s.fieldErrorVisible
                          : s.fieldError
                      }
                    >
                      {errors.lastName}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="email">
                    Email Address <span className={s.required}>*</span>
                  </label>
                  <input
                    className={`${s.input} ${errors.email ? s.inputError : ""}`}
                    type="email"
                    id="email"
                    name="email"
                    placeholder="jane@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                  />
                  <div
                    className={
                      errors.email ? s.fieldErrorVisible : s.fieldError
                    }
                  >
                    {errors.email}
                  </div>
                </div>

                {/* Phone */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="phone">
                    Phone Number{" "}
                    <span className={s.optional}>
                      (optional — for deadline text alerts)
                    </span>
                  </label>
                  <input
                    className={`${s.input} ${errors.phone ? s.inputError : ""}`}
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="(415) 555-0100"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError("phone");
                    }}
                  />
                  <div
                    className={
                      errors.phone ? s.fieldErrorVisible : s.fieldError
                    }
                  >
                    {errors.phone}
                  </div>
                </div>

                {/* Child Info Row */}
                <div className={s.formRow}>
                  <div className={s.formGroupHalf}>
                    <label className={s.label} htmlFor="grade">
                      Child&rsquo;s Current Grade{" "}
                      <span className={s.required}>*</span>
                    </label>
                    <select
                      className={`${s.select} ${errors.grade ? s.inputError : ""}`}
                      id="grade"
                      name="grade"
                      value={grade}
                      onChange={(e) => {
                        setGrade(e.target.value);
                        clearError("grade");
                      }}
                    >
                      <option value="" disabled>
                        Select grade
                      </option>
                      <optgroup label="Elementary (K–5)">
                        <option value="K">Kindergarten</option>
                        <option value="1">1st Grade</option>
                        <option value="2">2nd Grade</option>
                        <option value="3">3rd Grade</option>
                        <option value="4">4th Grade</option>
                        <option value="5">5th Grade</option>
                      </optgroup>
                      <optgroup label="Middle School (6–8)">
                        <option value="6">6th Grade</option>
                        <option value="7">7th Grade</option>
                        <option value="8">8th Grade</option>
                      </optgroup>
                      <optgroup label="High School (9–12)">
                        <option value="9">9th Grade</option>
                        <option value="10">10th Grade</option>
                        <option value="11">11th Grade</option>
                        <option value="12">12th Grade</option>
                      </optgroup>
                      <option value="multiple">Multiple Children</option>
                    </select>
                    <div
                      className={
                        errors.grade ? s.fieldErrorVisible : s.fieldError
                      }
                    >
                      {errors.grade}
                    </div>
                  </div>
                  <div className={s.formGroupHalf}>
                    <label className={s.label} htmlFor="district">
                      School District / City{" "}
                      <span className={s.required}>*</span>
                    </label>
                    <select
                      className={`${s.select} ${errors.district ? s.inputError : ""}`}
                      id="district"
                      name="district"
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        clearError("district");
                      }}
                    >
                      <option value="" disabled>
                        Select district
                      </option>
                      <option value="SFUSD">San Francisco USD</option>
                      <option value="OUSD">Oakland USD</option>
                      <option value="PAUSD">Palo Alto USD</option>
                      <option value="SAUSD">San Jose USD</option>
                      <option value="WCCUSD">West Contra Costa USD</option>
                      <option value="FUHSD">Fremont USD</option>
                      <option value="MVWSD">Mountain View USD</option>
                      <option value="other">Other Bay Area</option>
                    </select>
                    <div
                      className={
                        errors.district
                          ? s.fieldErrorVisible
                          : s.fieldError
                      }
                    >
                      {errors.district}
                    </div>
                  </div>
                </div>

                {/* Primary Interest */}
                <div className={s.formGroup}>
                  <label className={s.label} htmlFor="interest">
                    Primary Interest <span className={s.required}>*</span>
                  </label>
                  <select
                    className={`${s.select} ${errors.interest ? s.inputError : ""}`}
                    id="interest"
                    name="interest"
                    value={interest}
                    onChange={(e) => {
                      setInterest(e.target.value);
                      clearError("interest");
                    }}
                  >
                    <option value="" disabled>
                      What matters most to your family?
                    </option>
                    <option value="academics">
                      Academic Support &amp; Tutoring
                    </option>
                    <option value="college">
                      College Admissions &amp; Planning
                    </option>
                    <option value="enrichment">
                      Enrichment &amp; Extracurriculars
                    </option>
                    <option value="internships">
                      Internships &amp; Opportunities
                    </option>
                    <option value="all">All of the above</option>
                  </select>
                  <div
                    className={
                      errors.interest
                        ? s.fieldErrorVisible
                        : s.fieldError
                    }
                  >
                    {errors.interest}
                  </div>
                </div>

                {/* CONSENT CHECKBOXES */}
                <div className={s.consentSection}>
                  <div className={s.checkboxGroup}>
                    <input
                      className={s.checkbox}
                      type="checkbox"
                      id="consentEmail"
                      name="consentEmail"
                      checked={consentEmail}
                      onChange={(e) => {
                        setConsentEmail(e.target.checked);
                        clearError("consentEmail");
                      }}
                    />
                    <label className={s.checkboxLabel} htmlFor="consentEmail">
                      <strong className={s.checkboxLabelStrong}>
                        I agree to receive the free Learner&rsquo;s Edge Weekly
                        newsletter
                      </strong>{" "}
                      by email. I understand I can unsubscribe at any time by
                      clicking the unsubscribe link in any email.{" "}
                      <span className={s.required}>*</span>
                    </label>
                  </div>
                  <div
                    className={
                      errors.consentEmail
                        ? s.fieldErrorVisible
                        : s.fieldError
                    }
                  >
                    {errors.consentEmail}
                  </div>

                  <div className={s.checkboxGroupSpaced}>
                    <input
                      className={s.checkbox}
                      type="checkbox"
                      id="consentContact"
                      name="consentContact"
                      checked={consentContact}
                      onChange={(e) => setConsentContact(e.target.checked)}
                    />
                    <label
                      className={s.checkboxLabel}
                      htmlFor="consentContact"
                    >
                      I agree to be contacted by the Learner&rsquo;s Edge team
                      about tutoring, college advising, and educational
                      consulting services.{" "}
                      <span className={s.optional}>(Optional)</span>
                    </label>
                  </div>

                  <div className={s.checkboxGroupSpaced}>
                    <input
                      className={s.checkbox}
                      type="checkbox"
                      id="consentSMS"
                      name="consentSMS"
                      checked={consentSMS}
                      onChange={(e) => setConsentSMS(e.target.checked)}
                    />
                    <label className={s.checkboxLabel} htmlFor="consentSMS">
                      I agree to receive occasional SMS text alerts about urgent
                      deadlines and opportunities. Message and data rates may
                      apply. Reply STOP to opt out at any time.{" "}
                      <span className={s.optional}>(Optional)</span>
                    </label>
                  </div>
                </div>

                {/* LEGAL DISCLAIMER BOX */}
                <div className={s.disclaimerBox}>
                  <div className={s.disclaimerTitle}>
                    📋 Privacy &amp; Data Use Notice
                  </div>
                  <div className={s.disclaimerText}>
                    By submitting this form, you acknowledge that your name,
                    email address, phone number (if provided), and household
                    information will be collected and stored by Learner&rsquo;s
                    Edge Weekly in accordance with our{" "}
                    <a className={s.disclaimerLink} href="/privacy-policy">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a className={s.disclaimerLink} href="/terms">
                      Terms of Service
                    </a>
                    . This information may be used to send you the free weekly
                    newsletter, relevant educational opportunities, and (if
                    consented above) communications about tutoring and consulting
                    services.
                    <br />
                    <br />
                    We will never sell your personal information to third
                    parties. You may request deletion of your data at any time by
                    emailing{" "}
                    <a
                      className={s.disclaimerLink}
                      href="mailto:privacy@learnersedge.com"
                    >
                      privacy@learnersedge.com
                    </a>
                    . California residents have additional rights under the{" "}
                    <strong>
                      California Consumer Privacy Act (CCPA)
                    </strong>
                    . This form is protected by reCAPTCHA and Google&rsquo;s{" "}
                    <a
                      className={s.disclaimerLink}
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a
                      className={s.disclaimerLink}
                      href="https://policies.google.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms of Service
                    </a>{" "}
                    apply.
                    <br />
                    <br />
                    SMS consent: If you opt into text alerts above, you consent
                    to receive automated text messages from Learner&rsquo;s Edge
                    Weekly. Consent is not a condition of purchase. Message
                    frequency varies. Reply STOP to cancel, HELP for help.
                  </div>
                </div>

                {submitting ? (
                  <button type="button" className={s.submitBtnDisabled} disabled>
                    Submitting…
                  </button>
                ) : (
                  <button type="submit" className={s.submitBtn}>
                    Get My Free Subscription{" "}
                    <span className={s.btnArrow}>→</span>
                  </button>
                )}

                {/* TRUST BADGES */}
                <div className={s.trustRow}>
                  <div className={s.trustBadge}>
                    <span className={s.trustBadgeIcon}>🔒</span> Secure &amp;
                    Private
                  </div>
                  <div className={s.trustBadge}>
                    <span className={s.trustBadgeIcon}>📧</span> No Spam, Ever
                  </div>
                  <div className={s.trustBadge}>
                    <span className={s.trustBadgeIcon}>✉️</span> Cancel Anytime
                  </div>
                  <div className={s.trustBadge}>
                    <span className={s.trustBadgeIcon}>🆓</span> Always Free
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* SUCCESS VIEW */
            <div className={s.successState}>
              <div className={s.successIcon}>🎉</div>
              <div className={s.successTitle}>You&rsquo;re on the list!</div>
              <div className={s.successBody}>
                Welcome to Learner&rsquo;s Edge Weekly. Your first issue is
                coming this week — check your inbox (and your spam folder just
                in case). We&rsquo;re glad you&rsquo;re here.
                <br />
                <br />
                <span className={s.successConfirmation}>
                  A confirmation email is on its way to the address you
                  provided.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
