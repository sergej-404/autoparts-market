const currentYear = new Date().getFullYear();

const footerGroups = [
  {
    title: "Покупателям",
    items: ["Каталог товаров", "Подбор по автомобилю", "Избранное", "Корзина", "Мой аккаунт"],
  },
  {
    title: "Помощь",
    items: ["Как оформить заказ", "Доставка и оплата", "Возврат и обмен", "Частые вопросы", "Связаться с нами"],
  },
  {
    title: "Информация",
    items: ["О компании", "Условия использования", "Политика конфиденциальности", "Обработка персональных данных"],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <section className="footer-brand" aria-label="О компании AXION X">
            <div className="footer-logo" aria-label="AXION X">AXION <span>X</span></div>
            <p className="brand-copy">Автозапчасти для тех, кто ценит надёжность, точность и уверенность в дороге.</p>
            <p className="footer-tagline">Найдите деталь. <span>Двигайтесь дальше.</span></p>
            <div className="footer-socials" aria-label="Социальные сети">
              <span aria-label="Telegram">TG</span>
              <span aria-label="Instagram">IG</span>
              <span aria-label="YouTube">YT</span>
            </div>
          </section>

          {footerGroups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h2 className="footer-title">{group.title}</h2>
              <ul className="footer-links">
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}

          <section aria-label="Контакты">
            <h2 className="footer-title">Контакты</h2>
            <div className="contact-stack">
              <div className="contact-line"><span className="contact-label">Телефон</span><span className="contact-value">+371 20 000 000</span></div>
              <div className="contact-line"><span className="contact-label">Электронная почта</span><span className="contact-value">info@axionx.example</span></div>
              <div className="contact-line"><span className="contact-label">Время работы</span><span>Пн–Пт: 09:00–18:00</span></div>
            </div>
          </section>
        </div>

        <section className="footer-cta" aria-label="Помощь с подбором">
          <div>
            <h2>Не уверены, какая деталь подойдёт?</h2>
            <p>Свяжитесь с нами — поможем разобраться с подбором.</p>
          </div>
          <span className="footer-cta-label">Задать вопрос <span aria-hidden="true">↗</span></span>
        </section>

        <div className="footer-bottom">
          <p>© {currentYear} AXION X. Все права защищены.</p>
          <ul className="legal">
            <li>Конфиденциальность</li>
            <li>Пользовательское соглашение</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
