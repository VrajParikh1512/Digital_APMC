import { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { languageOptions } from '../translations';

// Languages that are written right-to-left
const RTL_LANGUAGES = ['ur', 'sd', 'ks'];

// ─── Small inline icons (no extra library needed) ────────────────────────────
const Icon = ({ children }) => (
  <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const icons = {
  marketplace: <Icon><path d="M3 9l1-5h16l1 5" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></Icon>,
  listings:    <Icon><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></Icon>,
  history:     <Icon><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></Icon>,
  predict:     <Icon><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></Icon>,
  admin:       <Icon><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></Icon>,
  globe:       <Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" /></Icon>,
  logout:      <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>,
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Language codes like "en-US" should still select "en" in the dropdown
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  // Links shown for each role
  const links = [];
  if (user?.role === 'Business Owner') {
    links.push({ to: '/marketplace', label: t('navbar.marketplace'), icon: icons.marketplace });
  }
  if (user?.role === 'Farmer') {
    links.push({ to: '/my-listings', label: t('navbar.myListings'), icon: icons.listings });
    links.push({ to: '/price-history', label: t('navbar.priceHistory'), icon: icons.history });
    links.push({ to: '/price-prediction', label: t('navbar.pricePrediction'), icon: icons.predict });
  }
  if (user?.role === 'Admin') {
    links.push({ to: '/admin', label: t('navbar.adminPanel'), icon: icons.admin });
  }

  // Close the mobile menu when the page changes
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Add a shadow once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep <html lang> and text direction in sync with the chosen language
  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = RTL_LANGUAGES.includes(currentLang) ? 'rtl' : 'ltr';
  }, [currentLang]);

  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : '?';

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">

        {/* Logo */}
        <Link to="/" className="logo">
          <span className="logo-mark">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#052e16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </span>
          <span className="logo-text">Digital <span>APMC</span></span>
        </Link>

        {/* Mobile menu button */}
        <button
          type="button"
          className={`nav-toggle ${menuOpen ? 'open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span /><span /><span />
        </button>

        {/* Links + actions */}
        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <div className="nav-links">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            {/* Language picker */}
            <label className="lang-picker" title="Language">
              {icons.globe}
              <select value={currentLang} onChange={(e) => i18n.changeLanguage(e.target.value)} aria-label="Language">
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </label>

            {user ? (
              <>
                <div className="user-chip">
                  <span className="avatar">{initial}</span>
                  <span className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                  </span>
                </div>
                <button type="button" className="nav-btn nav-btn-ghost" onClick={logout}>
                  {icons.logout}
                  <span>{t('navbar.logout')}</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link"><span>{t('navbar.login')}</span></NavLink>
                <Link to="/signup" className="nav-btn nav-btn-primary">{t('navbar.signup')}</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
