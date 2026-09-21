import React from "react";
import { businessName, hours, phone, address, email } from "../data";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <h3>{businessName}</h3>
        <ul>
          <li>שעות פעילות: {hours}</li>
          <li>
            טלפון: <a href={`tel:${phone}`}>{phone}</a>
          </li>
          <li>כתובת: {address}</li>
          <li>
            אימייל: <a href={`mailto:${email}`}>{email}</a>
          </li>
        </ul>
        <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
          © {new Date().getFullYear()} {businessName}. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
