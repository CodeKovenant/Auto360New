import { SiFacebook, SiX, SiInstagram, SiTiktok } from "react-icons/si";
import { MessageCircle, Mail } from "lucide-react";

const SOCIAL_LINKS = [
  { icon: SiFacebook, href: "https://facebook.com", label: "Facebook", color: "hover:text-blue-400" },
  { icon: SiX, href: "https://x.com", label: "X", color: "hover:text-gray-100" },
  { icon: SiInstagram, href: "https://instagram.com", label: "Instagram", color: "hover:text-pink-400" },
  { icon: SiTiktok, href: "https://tiktok.com", label: "TikTok", color: "hover:text-red-400" },
];

export default function TopBar() {
  return (
    <div className="bg-red-700 text-red-100 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
        {/* Left — welcome + contact */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <span className="hidden sm:block font-semibold text-white whitespace-nowrap flex-shrink-0">
            Welcome to Auto360Ke
          </span>
          <a
            href="mailto:info@auto360.co.ke"
            className="hidden md:flex items-center gap-1.5 text-white hover:text-red-200 transition-colors flex-shrink-0"
            data-testid="topbar-email"
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span>info@auto360.co.ke</span>
          </a>
          <a
            href="https://wa.me/254764999688"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white hover:text-red-200 transition-colors min-w-0"
            data-testid="topbar-whatsapp"
          >
            <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Call/WhatsApp: </span>0764 999 688
            </span>
          </a>
        </div>

        {/* Right — social media */}
        <div className="flex items-center gap-3 flex-shrink-0" data-testid="topbar-social">
          {SOCIAL_LINKS.map(({ icon: Icon, href, label, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`text-red-300 transition-colors ${color}`}
              data-testid={`topbar-social-${label.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
