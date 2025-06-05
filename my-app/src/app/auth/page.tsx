'use client';
import { useEffect, useState } from 'react';
import styles from './auth.module.css';
import type { UserOut, UserCreate } from '../../types/User';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('login');
  const [loading, setLoading] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null); // Новое состояние
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<UserOut | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingRoot}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}</style>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>
            Загружаем пиксели... Пожалуйста, не выключайте интернет! 🚀🧠
          </span>
        </div>
      </div>
    );
  }

  // Искусственное отображение ошибки
  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.card} style={{ alignItems: "center", color: "#d32f2f", paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 12, animation: "shake 0.7s" }}>🚨</div>
          <h2 style={{ marginBottom: 8, fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>
            Ой, щось пішло не так!
          </h2>
          <div style={{ marginBottom: 18, fontSize: 17, color: "#b71c1c", textAlign: "center" }}>
            {error}
          </div>
          <div style={{
            background: "#fff3e0",
            color: "#ff9800",
            borderRadius: 8,
            padding: "10px 18px",
            marginBottom: 18,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 8px #ff980033"
          }}>
            <span style={{ fontSize: 22 }}>💡</span>
            Спробуйте перевірити підключення до інтернету або оновити сторінку.
          </div>
          <button
            className={styles.submitBtn}
            style={{ background: "#2196f3", minWidth: 180 }}
            onClick={() => setError(null)}
          >
            Спробувати ще раз
          </button>
          <style>{`
            @keyframes shake {
              0% { transform: translateX(0);}
              20% { transform: translateX(-8px);}
              40% { transform: translateX(8px);}
              60% { transform: translateX(-6px);}
              80% { transform: translateX(6px);}
              100% { transform: translateX(0);}
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className={styles.root}>
        <div className={styles.card} style={{ alignItems: "center", paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
          <h2 style={{ marginBottom: 8, fontWeight: 800, fontSize: 24 }}>
            Вітаємо, {user.login}!
          </h2>
          <div style={{ marginBottom: 18, fontSize: 16 }}>
            Ви увійшли як <b>{user.role}</b>. <br />
            Зареєстровано: {new Date(user.registered_at).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!login.trim() || !password.trim()) {
      setError("Будь ласка, заповніть всі поля.");
      return;
    }

    try {
      const endpoint = activeTab === 'register' ? '/api/register' : '/api/login';
      const payload =
        activeTab === 'register'
          ? { login, password } as UserCreate
          : { login, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Сталася помилка. Спробуйте ще раз.");
        return;
      }

      const data: UserOut = await res.json();
      setUser(data);
      setLogin('');
      setPassword('');
    } catch (err) {
      setError("Не вдалося підключитися до сервера. Спробуйте ще раз.");
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {/* Кнопка для теста ошибки
        <button
          className={styles.submitBtn}
          style={{ marginBottom: 16, background: "#d32f2f" }}
          onClick={() => setError("Тестова помилка! Щось пішло не так.")}
        >
          Вызвать ошибку (тест)
        </button> */}
        {!forgot ? (
          <>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`}
                onClick={() => setActiveTab('register')}
                type="button"
              >
                Зареєструватися
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`}
                onClick={() => setActiveTab('login')}
                type="button"
              >
                Увійти
              </button>
            </div>
            <form className={styles.form} onSubmit={handleAuth}>
              <h2 className={styles.title}>
                {activeTab === 'register' ? 'Зареєструватися' : 'Увійти'}
              </h2>
              <input
                className={styles.input}
                type="text"
                placeholder="Логін"
                value={login}
                onChange={e => setLogin(e.target.value)}
                required
              />
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <a
                  href="#"
                  className={styles.forgot}
                  onClick={e => {
                    e.preventDefault();
                    setForgot(true);
                  }}
                >
                  Забули пароль?
                </a>
              </div>
              <button type="button" className={styles.googleBtn}>
                Продовжити з Google
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className={styles.googleIcon}
                />
              </button>
              <div className={styles.info}>
                Увійшовши в систему, ви погоджуєтеся з{' '}
                <a
                  href="https://www.privacypolicies.com/live/97b147a3-48dc-4d1e-8ee3-ba19d17f27f2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Умовами надання послуги та Політикою конфіденційності
                </a>
              </div>
              <button type="submit" className={styles.submitBtn}>
                {activeTab === 'register' ? 'Зареєструватися' : 'Увійти'}
              </button>
            </form>
            <div className={styles.bottomText}>
              {activeTab === 'register' ? (
                <>
                  Вже маєте обліковий запис?
                  <a
                    href="#"
                    className={styles.registerLink}
                    onClick={e => {
                      e.preventDefault();
                      setActiveTab('login');
                    }}
                  >
                    Увійти
                  </a>
                </>
              ) : (
                <>
                  Потрібен обліковий запис?
                  <a
                    href="#"
                    className={styles.registerLink}
                    onClick={e => {
                      e.preventDefault();
                      setActiveTab('register');
                    }}
                  >
                    Зареєструватися
                  </a>
                </>
              )}
            </div>
          </>
        ) : (
          <form className={styles.form} style={{ minWidth: 280 }}>
            <h2 className={styles.title} style={{ textAlign: 'center' }}>
              Скинути пароль
            </h2>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              Будь ласка, введіть адресу електронної пошти, пов'язану з вашим обліковим записом.
            </div>
            <input
              className={styles.input}
              type="email"
              placeholder="Адреса електронної пошти"
            />
            <button type="submit" className={styles.submitBtn}>
              Скинути пароль
            </button>
            <div className={styles.bottomText}>
              <a
                href="#"
                className={styles.registerLink}
                onClick={e => {
                  e.preventDefault();
                  setForgot(false);
                }}
              >
                Повернутися до входу
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}