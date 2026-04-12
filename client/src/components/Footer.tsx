import { Link } from "wouter";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Col 1: Brand */}
          <div>
            <Link href="/">
              <img src="/logo.png" alt="Auto360" className="h-11 w-auto object-contain mb-4 brightness-0 invert" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Kenya's premier automotive marketplace. Find verified dealers, garages, spare parts, car wash services and more.
            </p>
            <div className="space-y-2">
              <a href="mailto:info@auto360.co.ke" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                info@auto360.co.ke
              </a>
              <a href="tel:+254764999688" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
                0764 999 688
              </a>
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                Nairobi, Kenya
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Browse */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Browse</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/automobile-dealers" className="hover:text-white transition-colors">Automobile Dealers</Link></li>
              <li><Link href="/autospares-dealers" className="hover:text-white transition-colors">Autospares Dealers</Link></li>
              <li><Link href="/autogarage-repair" className="hover:text-white transition-colors">Autogarage Repair</Link></li>
              <li><Link href="/automotive-support" className="hover:text-white transition-colors">Automotive Support</Link></li>
              <li><Link href="/cars" className="hover:text-white transition-colors">Cars for Sale</Link></li>
              <li><Link href="/businesses" className="hover:text-white transition-colors">All Businesses</Link></li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Company</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/register-business" className="hover:text-white transition-colors">Register Your Business</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><a href="mailto:info@auto360.co.ke" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Col 4: Coverage */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Coverage</h4>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">Serving automotive businesses across all 47 counties of Kenya.</p>
            <div className="flex flex-wrap gap-1.5">
              {["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Meru"].map(city => (
                <span key={city} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-md">{city}</span>
              ))}
              <span className="text-xs text-gray-600 px-2.5 py-1">+39 more</span>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Auto360 Kenya. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms &amp; Conditions</Link>
            <span>·</span>
            <a href="mailto:info@auto360.co.ke" className="hover:text-gray-300 transition-colors">info@auto360.co.ke</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
