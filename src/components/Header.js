import React from "react";
import { businessName } from "../data";

const links = [
  { href: "#chat", label: "צ׳אט" },
  { href: "#services", label: "שירותים" },
  { href: "#faq", label: "שאלות נפוצות" },
  { href: "#contact", label: "קביעת תור" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <a className="brand" href="#top">
          {businessName}
        </a>
        <nav className="nav" aria-label="ניווט ראשי">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
