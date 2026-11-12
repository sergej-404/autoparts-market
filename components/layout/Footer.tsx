"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";

const currentYear = new Date().getFullYear();

type FooterLink = { label: string; href: string };
type FooterGroup = { id: string; title: string; links: FooterLink[] };

const footerGroups: FooterGroup[] = [
  {
    id: "buyers",
    title: "Покупателям",
    links: [
      { label: "Каталог товаров", href: "/catalog" },
      { label: "Подбор по автомобилю", href: "/catalog" },
      { label: "Избранное", href: "/favorites" },
      { label: "Заказ", href: "/cart" },
      { label: "Мой аккаунт", href: "/login" },
    ],
  },
  {
    id: "help",
    title: "Помощь",
    links: [
      { label: "Как оформить заказ", href: "/cart" },
      { label: "Связаться с нами", href: "mailto:info@axionx.example" },
    ],
  },
];

export function Footer() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className={`footer-brand${activeGroup ? " is-hidden" : ""}`}>
          <div className="footer-logo" aria-label="AXION X">AXION <span>X</span></div>
          <p className="brand-copy">Автозапчасти для тех, кто ценит надёжность, точность и уверенность в дороге.</p>
          <p className="footer-tagline">Найдите деталь. <span>Двигайтесь дальше.</span></p>
        </div>

        <nav className={`footer-nav${activeGroup ? " is-open" : ""}`} aria-label="Навигация в подвале">
          {footerGroups.map((group, index) => {
            const isActive = activeGroup === group.id;
            return (
              <section className={`footer-level${isActive ? " active" : ""}`} key={group.id}>
                <button
                  type="button"
                  className="footer-level-btn"
                  aria-expanded={isActive}
                  aria-controls={`footer-panel-${group.id}`}
                  onClick={() => setActiveGroup(isActive ? null : group.id)}
                >
                  <span className="footer-btn-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span className="footer-btn-label">{group.title}</span>
                  <Plus className="footer-btn-icon" size={18} aria-hidden="true" />
                </button>
                <div className="footer-level-panel" id={`footer-panel-${group.id}`}>
                  <div className="footer-level-panel-inner">
                    <div className="footer-panel-content">
                      <h2>{group.title}</h2>
                      <ul className="footer-list">
                        {group.links.map((item) => (
                          <li key={item.label}>
                            <Link href={item.href}>
                              <span>{item.label}</span>
                              <ArrowUpRight size={14} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          <section className={`footer-level footer-contacts${activeGroup === "contacts" ? " active" : ""}`}>
            <button
              type="button"
              className="footer-level-btn"
              aria-expanded={activeGroup === "contacts"}
              aria-controls="footer-panel-contacts"
              onClick={() => setActiveGroup(activeGroup === "contacts" ? null : "contacts")}
            >
              <span className="footer-btn-index" aria-hidden="true">03</span>
              <span className="footer-btn-label">Контакты</span>
              <Plus className="footer-btn-icon" size={18} aria-hidden="true" />
            </button>
            <div className="footer-level-panel" id="footer-panel-contacts">
              <div className="footer-level-panel-inner">
                <div className="footer-panel-content">
                  <h2>Контакты</h2>
                  <ul className="footer-list contacts-list">
                    <li><div className="contact-row"><span className="contact-label">Телефон</span><a href="tel:+37120000000">+371 20 000 000</a></div></li>
                    <li><div className="contact-row"><span className="contact-label">Электронная почта</span><a href="mailto:info@axionx.example">info@axionx.example</a></div></li>
                    <li><div className="contact-row"><span className="contact-label">Время работы</span><span>Пн–Пт: 09:00–18:00</span></div></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </nav>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} AXION X. Все права защищены.</p>
        <ul className="legal">
          <li>Конфиденциальность</li>
          <li>Пользовательское соглашение</li>
        </ul>
      </div>
    </footer>
  );
}
