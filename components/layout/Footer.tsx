"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";

const currentYear = new Date().getFullYear();

type FooterLink = { label: string; href?: string; modal?: "order" | "contact" };
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
      { label: "Как оформить заказ", modal: "order" },
      { label: "Связаться с нами", modal: "contact" },
    ],
  },
];

type HelpModal = "order" | "contact" | null;

export function Footer() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [helpModal, setHelpModal] = useState<HelpModal>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setActiveGroup(null);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleBreakpointChange);
      return () => mediaQuery.removeEventListener("change", handleBreakpointChange);
    }
    mediaQuery.addListener(handleBreakpointChange);
    return () => mediaQuery.removeListener(handleBreakpointChange);
  }, []);

  useEffect(() => {
    if (!helpModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpModal(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [helpModal]);

  const closeModal = () => setHelpModal(null);

  return (
    <>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo" aria-label="AXION X">AXION <span>X</span></div>
            <p className="brand-copy">Автозапчасти для тех, кто ценит надёжность, точность и уверенность в дороге.</p>
            <p className="footer-tagline">Найдите деталь. <span>Двигайтесь дальше.</span></p>
          </div>

          <nav className={`footer-nav${activeGroup ? " is-open" : ""}`} aria-label="Навигация в подвале">
            {footerGroups.map((group) => {
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
                              {item.modal ? (
                                <button type="button" className="footer-modal-link" onClick={() => setHelpModal(item.modal ?? null)}>
                                  <span>{item.label}</span><ArrowUpRight size={14} aria-hidden="true" />
                                </button>
                              ) : (
                                <Link href={item.href ?? "/"}>
                                  <span>{item.label}</span><ArrowUpRight size={14} aria-hidden="true" />
                                </Link>
                              )}
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

      {helpModal && (
        <div
          className="footer-help-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="footer-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-help-title"
          >
            <header className="footer-help-header">
              <div>
                <p className="footer-help-eyebrow">AXION X · ПОМОЩЬ</p>
                <h2 id="footer-help-title">{helpModal === "order" ? "Как оформить заказ" : "Связаться с нами"}</h2>
              </div>
              <button type="button" className="footer-help-close" onClick={closeModal} aria-label="Закрыть окно">
                <X size={21} />
              </button>
            </header>

            {helpModal === "order" ? (
              <div className="footer-help-body">
                <p className="footer-help-intro">Оформление заказа проходит в несколько простых этапов:</p>
                <ol className="footer-help-steps">
                  <li><span>01</span><div><strong>Регистрация или вход</strong><p>Создайте аккаунт или войдите в существующий. <Link href="/register" onClick={closeModal}>Регистрация</Link> или <Link href="/login" onClick={closeModal}>Вход</Link>.</p></div></li>
                  <li><span>02</span><div><strong>Выбор товара</strong><p>Откройте каталог, найдите нужную автозапчасть и перейдите к её карточке.</p></div></li>
                  <li><span>03</span><div><strong>Добавление в заказ</strong><p>Добавьте выбранный товар в корзину (раздел «Заказ»). При необходимости добавьте другие товары.</p></div></li>
                  <li><span>04</span><div><strong>Оформление заказа</strong><p>Перейдите в раздел «Заказ», проверьте состав и количество товаров и нажмите «Оформить».</p></div></li>
                  <li><span>05</span><div><strong>Ввод необходимых данных</strong><p>Укажите ФИО, номер телефона и способ получения, затем отправьте заказ.</p></div></li>
                  <li><span>06</span><div><strong>Общение с продавцом</strong><p>После оформления свяжитесь с продавцом и уточните детали заказа, наличие и условия получения.</p></div></li>
                  <li><span>07</span><div><strong>Получение и оплата</strong><p>Дальнейшие условия получения и оплаты согласуйте непосредственно с продавцом.</p></div></li>
                </ol>
              </div>
            ) : (
              <div className="footer-help-body">
                <p className="footer-help-intro">Чтобы связаться с продавцом и задать вопрос:</p>
                <ol className="footer-help-steps">
                  <li><span>01</span><div><strong>Регистрация или вход</strong><p>Войдите в аккаунт или создайте новый: <Link href="/register" onClick={closeModal}>Регистрация</Link> или <Link href="/login" onClick={closeModal}>Вход</Link>.</p></div></li>
                  <li><span>02</span><div><strong>Напишите продавцу</strong><p>Откройте карточку интересующего товара, перейдите к общению с продавцом и задайте свой вопрос.</p></div></li>
                </ol>
                <div className="footer-help-contacts">
                  <h3>Контактные данные</h3>
                  <p><span>Телефон</span><a href="tel:+37120000000">+371 20 000 000</a></p>
                  <p><span>Электронная почта</span><a href="mailto:info@axionx.example">info@axionx.example</a></p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
