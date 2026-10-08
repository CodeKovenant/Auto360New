import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/register-business">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">

          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
              <p className="text-sm text-muted-foreground">Auto360Ke — Effective 1 January 2025</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-8 mt-4">
            Please read these Terms and Conditions carefully before registering your business on the Auto360Ke platform. By submitting a listing you agree to be bound by these terms.
          </p>

          <div className="space-y-7 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">1. About Auto360Ke</h2>
              <p>
                Auto360Ke (<strong>auto360.co.ke</strong>) is an online automotive marketplace and business directory serving Kenya. We connect vehicle owners and buyers with trusted automobile dealers, spare parts suppliers, garages, car wash services, and other automotive service providers across all 47 counties.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">2. Business Listing Eligibility</h2>
              <p className="mb-2">To register a business on Auto360Ke you must:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Be the owner or an authorised representative of the business.</li>
                <li>Provide accurate, truthful, and up-to-date business information.</li>
                <li>Operate a legitimate automotive business within Kenya.</li>
                <li>Hold any licences or permits required by Kenyan law for your business category.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">3. Listing Review & Approval</h2>
              <p>
                All business listings are subject to review and approval by the Auto360Ke admin team. We reserve the right to approve, reject, or remove any listing at our sole discretion, including listings that contain inaccurate information, violate these terms, or are otherwise deemed unsuitable for the platform.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">4. Accuracy of Information</h2>
              <p>
                You are solely responsible for ensuring that all information submitted — including business name, contact details, location, description, and images — is accurate and current. Auto360Ke will not be held liable for any loss or damage arising from inaccurate or misleading business information.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">5. Subscription & Premium Listings</h2>
              <p className="mb-2">
                Auto360Ke offers both free and premium (paid) listing tiers. Premium listings benefit from enhanced visibility, priority placement, and additional features. Subscription fees are charged via M-Pesa and are non-refundable unless otherwise stated. Subscriptions auto-renew unless cancelled before the renewal date.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">6. Prohibited Content</h2>
              <p className="mb-2">You must not submit listings or content that:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Is false, misleading, or fraudulent.</li>
                <li>Infringes any third-party intellectual property rights.</li>
                <li>Promotes illegal goods, services, or activities.</li>
                <li>Contains offensive, discriminatory, or harmful language.</li>
                <li>Involves businesses that are not automotive in nature.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">7. Intellectual Property</h2>
              <p>
                By uploading logos, images, or other content to Auto360Ke, you grant us a non-exclusive, royalty-free licence to display that content on our platform for the purpose of promoting your listing. You confirm that you own or have the right to use all content you submit.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">8. Customer Reviews</h2>
              <p>
                Customers may leave reviews on your business listing. Auto360Ke does not endorse or verify the accuracy of individual reviews. We reserve the right to remove reviews that violate our community guidelines. You must not post fake reviews or incentivise customers to post biased reviews.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">9. Limitation of Liability</h2>
              <p>
                Auto360Ke provides a platform for connecting businesses with customers and does not act as an agent or guarantor of any transaction between them. We shall not be liable for any direct, indirect, or consequential loss arising from your use of the platform or any transaction conducted with a customer found through Auto360Ke.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">10. Termination</h2>
              <p>
                We reserve the right to suspend or permanently remove any business listing or user account that violates these Terms, engages in fraudulent activity, or acts in a manner harmful to the platform or its users, without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">11. Privacy</h2>
              <p>
                Your use of Auto360Ke is also governed by our Privacy Policy. By registering, you consent to the collection and use of your information as described therein. We will not sell or share your personal data with third parties except as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Republic of Kenya. Any disputes arising from or related to your use of Auto360Ke shall be subject to the exclusive jurisdiction of the courts of Kenya.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">13. Changes to These Terms</h2>
              <p>
                Auto360Ke reserves the right to update or modify these Terms at any time. Continued use of the platform after any changes constitutes acceptance of the updated Terms. We will notify registered users of significant changes via email.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">14. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:info@auto360.co.ke" className="text-red-600 dark:text-red-400 underline font-medium">info@auto360.co.ke</a>
                {" "}or call/WhatsApp <a href="tel:+254764999688" className="text-red-600 dark:text-red-400 underline font-medium">0764 999 688</a>.
              </p>
            </section>

          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex gap-3 flex-wrap">
            <Link href="/register-business">
              <Button className="bg-red-600 hover:bg-red-700 text-white" data-testid="button-accept-terms">
                I Accept — Register My Business
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
