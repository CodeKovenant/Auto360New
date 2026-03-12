import { SiFacebook, SiX, SiInstagram, SiTiktok } from "react-icons/si";
import { MessageCircle, Mail } from "lucide-react";

const SOCIAL_LINKS = [
  { icon: SiFacebook, href: "https://facebook.com", label: "Facebook", color: "hover:text-blue-500" },
  { icon: SiX, href: "https://x.com", label: "X", color: "hover:text-gray-100" },
  { icon: SiInstagram, href: "https://instagram.com", label: "Instagram", color: "hover:text-pink-400" },
  { icon: SiTiktok, href: "https://tiktok.com", label: "TikTok", color: "hover:text-red-400" },
];

export default function TopBar() {
  return (
    <div className="bg-gray-950 text-orange-100 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
        {/* Left — welcome + contact */}
        <div className="flex items-center gap-4 overflow-hidden">
          <span className="hidden sm:block font-medium text-white/90 whitespace-nowrap">
            Welcome to AutoDirectory Kenya
          </span>
          <a
            href="mailto:hello@autodirectory.co.ke"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
            data-testid="topbar-email"
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden md:block">hello@autodirectory.co.ke</span>
          </a>
          <a
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
            data-testid="topbar-whatsapp"
          >
            <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>+254 700 000 000</span>
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
              className={`text-gray-400 transition-colors ${color}`}
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
