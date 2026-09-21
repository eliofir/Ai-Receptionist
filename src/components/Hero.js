import React from "react";
import { businessName, tagline } from "../data";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container">
        <h1>{businessName}</h1>
        <p>{tagline}</p>
        <a className="btn" href="#chat">
          דברו עם המזכירה הווירטואלית
        </a>
      </div>
    </section>
  );
}
