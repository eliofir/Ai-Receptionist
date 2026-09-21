import React, { useState } from "react";
import { services } from "../data";

const EMPTY = { name: "", phone: "", service: "", date: "", notes: "" };

export default function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function onSubmit(e) {
    e.preventDefault();
    setSent(true);
    setForm(EMPTY);
  }

  return (
    <section className="section" id="contact">
      <div className="container">
        <h2>קביעת תור / יצירת קשר</h2>
        <form className="contact-form" onSubmit={onSubmit}>
          {sent && (
            <p className="form-note" role="status">
              תודה! בקשתכם נקלטה ונחזור אליכם בהקדם.
            </p>
          )}
          <div className="field">
            <label htmlFor="name">שם מלא</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={update}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">טלפון</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={update}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="service">שירות מבוקש</label>
            <select
              id="service"
              name="service"
              value={form.service}
              onChange={update}
              required
            >
              <option value="">בחרו שירות…</option>
              {services.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="date">תאריך מועדף</label>
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={update}
            />
          </div>
          <div className="field">
            <label htmlFor="notes">הערות נוספות</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={form.notes}
              onChange={update}
            />
          </div>
          <button className="btn" type="submit">
            שליחת בקשה
          </button>
        </form>
      </div>
    </section>
  );
}
