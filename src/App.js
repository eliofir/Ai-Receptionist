import React from 'react';
import './App.css';

const projects = [
  {
    title: 'AI Receptionist',
    description:
      'An AI-powered virtual receptionist that greets visitors, answers questions, and routes inquiries.',
    link: '#',
  },
  {
    title: 'Portfolio Website',
    description:
      'A responsive personal portfolio built with React and modern CSS.',
    link: '#',
  },
  {
    title: 'Task Manager',
    description:
      'A productivity app for organizing tasks, projects, and deadlines.',
    link: '#',
  },
];

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="header__name">Elio Fir</h1>
        <p className="header__title">Front-End Developer &amp; React Enthusiast</p>
      </header>

      <main className="main">
        <section id="about" className="section">
          <h2 className="section__title">About Me</h2>
          <p className="section__text">
            Hi, I'm Elio — a developer passionate about building clean, accessible,
            and delightful user interfaces. I specialize in React, modern JavaScript,
            and crafting responsive web experiences that people love to use.
          </p>
        </section>

        <section id="projects" className="section">
          <h2 className="section__title">Projects</h2>
          <div className="projects">
            {projects.map((project) => (
              <article key={project.title} className="project">
                <h3 className="project__title">{project.title}</h3>
                <p className="project__description">{project.description}</p>
                <a className="project__link" href={project.link}>
                  View project →
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section">
          <h2 className="section__title">Contact</h2>
          <p className="section__text">
            Interested in working together or just want to say hi? Feel free to reach out.
          </p>
          <ul className="contact">
            <li className="contact__item">
              Email: <a href="mailto:hello@example.com">hello@example.com</a>
            </li>
            <li className="contact__item">
              GitHub: <a href="https://github.com/eliofir">github.com/eliofir</a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Elio Fir. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
