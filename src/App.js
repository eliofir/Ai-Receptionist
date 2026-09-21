import React from "react";
import "./App.css";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Chat from "./components/Chat";
import PriceList from "./components/PriceList";
import Faq from "./components/Faq";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Chat />
        <PriceList />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
