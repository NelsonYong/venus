import { Metadata } from "next";
import { LegalLayout } from "../components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy - Venus AI",
  description:
    "Learn how Venus AI collects, uses, and protects your personal information. Your privacy is our priority.",
  openGraph: {
    title: "Privacy Policy - Venus AI",
    description:
      "Learn how Venus AI collects, uses, and protects your personal information. Your privacy is our priority.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="December 2, 2024">
      <section>
        <h2>1. Introduction</h2>
        <p>
          Venus AI ("we," "our," or "us") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard
          your information when you use our Service.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li>
            <strong>Account Information:</strong> Name, email address, and profile
            information when you create an account
          </li>
          <li>
            <strong>Chat Content:</strong> Messages and conversations you have with
            our AI assistant
          </li>
          <li>
            <strong>Payment Information:</strong> Billing details processed securely
            through third-party payment processors
          </li>
          <li>
            <strong>Support Communications:</strong> Information you provide when
            contacting customer support
          </li>
        </ul>

        <h3>2.2 Automatically Collected Information</h3>
        <ul>
          <li>
            <strong>Usage Data:</strong> Information about how you use the Service,
            including features accessed and actions taken
          </li>
          <li>
            <strong>Device Information:</strong> Browser type, operating system,
            device identifiers, and IP address
          </li>
          <li>
            <strong>Cookies:</strong> We use cookies and similar technologies to
            enhance your experience
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul>
          <li>To provide, maintain, and improve the Service</li>
          <li>To process your transactions and manage your account</li>
          <li>To communicate with you about updates, security alerts, and support</li>
          <li>To personalize your experience and provide relevant content</li>
          <li>To train and improve our AI models</li>
          <li>To detect, prevent, and address technical issues and fraud</li>
          <li>To comply with legal obligations and enforce our terms</li>
        </ul>
      </section>

      <section>
        <h2>4. Information Sharing and Disclosure</h2>
        <p>We do not sell your personal information. We may share information in the following circumstances:</p>
        
        <h3>4.1 With Your Consent</h3>
        <p>We will share information when you explicitly authorize us to do so.</p>

        <h3>4.2 Service Providers</h3>
        <p>
          We work with third-party service providers who assist in operating our
          Service, such as hosting, analytics, and payment processing. These
          providers have access to your information only to perform specific tasks
          on our behalf.
        </p>

        <h3>4.3 Legal Requirements</h3>
        <p>
          We may disclose information if required by law or in response to valid
          requests by public authorities.
        </p>

        <h3>4.4 Business Transfers</h3>
        <p>
          In the event of a merger, acquisition, or sale of assets, your information
          may be transferred to the acquiring entity.
        </p>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect
          your information against unauthorized access, alteration, disclosure, or
          destruction. These measures include:
        </p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Regular security assessments and audits</li>
          <li>Access controls and authentication mechanisms</li>
          <li>Employee training on data protection</li>
        </ul>
        <p>
          However, no method of transmission over the Internet or electronic storage
          is 100% secure. We cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <p>
          We retain your information for as long as necessary to provide the Service
          and fulfill the purposes outlined in this Privacy Policy. You may delete
          your account at any time, after which we will delete or anonymize your
          personal information, except where retention is required by law.
        </p>
      </section>

      <section>
        <h2>7. Your Privacy Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request access to your personal information
          </li>
          <li>
            <strong>Correction:</strong> Request correction of inaccurate information
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your information
          </li>
          <li>
            <strong>Data Portability:</strong> Request a copy of your data in a
            portable format
          </li>
          <li>
            <strong>Opt-Out:</strong> Opt-out of certain data processing activities
          </li>
          <li>
            <strong>Withdraw Consent:</strong> Withdraw consent for data processing
            where consent is the legal basis
          </li>
        </ul>
        <p>
          To exercise these rights, please contact us at privacy@venus-ai.com
        </p>
      </section>

      <section>
        <h2>8. Children's Privacy</h2>
        <p>
          Our Service is not intended for children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you
          believe we have collected information from a child under 13, please
          contact us immediately.
        </p>
      </section>

      <section>
        <h2>9. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other
          than your country of residence. These countries may have different data
          protection laws. We ensure appropriate safeguards are in place to protect
          your information.
        </p>
      </section>

      <section>
        <h2>10. Third-Party Links</h2>
        <p>
          Our Service may contain links to third-party websites. We are not
          responsible for the privacy practices of these external sites. We
          encourage you to review their privacy policies.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of
          any material changes by posting the new policy on this page and updating
          the "Last Updated" date. We encourage you to review this Privacy Policy
          periodically.
        </p>
      </section>

      <section>
        <h2>12. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or our
          data practices, please contact us at:
        </p>
        <ul>
          <li>Email: privacy@venus-ai.com</li>
          <li>Support: support@venus-ai.com</li>
        </ul>
      </section>
    </LegalLayout>
  );
}

