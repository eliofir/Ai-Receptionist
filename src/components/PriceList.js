import React from "react";
import { services } from "../data";

export default function PriceList() {
  return (
    <section className="section" id="services">
      <div className="container">
        <h2>השירותים והמחירים שלנו</h2>
        <div className="cards">
          {services.map((s) => (
            <article className="card" key={s.name}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <span className="price">{s.price}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
