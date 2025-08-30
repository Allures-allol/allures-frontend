'use client';
import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import styles from './auth.module.css';
import type { UserOut} from '../../types/User';
import Image from 'next/image';

const AUTH_BASE = 'https://api.alluresallol.com/auth';

async function smartAuthFetch(path: string, body: any): Promise<Response> {
  // 1) пробуем локальный прокси (если есть route handlers /api/auth/* — не будет CORS)
  try {
    const local = await fetch(`/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    // если роута нет — 404, пробуем напрямую
    if (local.status !== 404) return local;
  } catch {}
  // 2) прямой запрос на бек
  return fetch(`${AUTH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
}

interface FastAPIError {
loc?: (string | number)[];
msg: string;
type?: string;
}

export default function AuthPage() {
  const router = useRouter();
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
// Если пользователь уже авторизован, показываем приветствие
  // if (user) { 
  //   
  //   return (
  //     <div className={styles.root}>
  //       <div className={styles.card} style={{ alignItems: "center", paddingTop: 40, paddingBottom: 40 }}>
  //         <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
  //         <h2 style={{ marginBottom: 8, fontWeight: 800, fontSize: 24 }}>
  //           Вітаємо, {user.login}!
  //         </h2>
  //         <div style={{ marginBottom: 18, fontSize: 16 }}>
  //           Ви увійшли як <b>{user.role}</b>. <br />
  //           Зареєстровано: {new Date(user.registered_at).toLocaleString()}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!login.trim() || !password.trim()) {
      setError("Будь ласка, заповніть всі поля.");
      return;
    }

    // Бэк ожидает email+password. Поле "login" используем как email.
    const path = activeTab === 'register' ? '/register' : '/login';
    const payload = { email: login, password };

    let res: Response;
    try {
      res = await smartAuthFetch(path, payload);
    } catch (e) {
      // Сетевая ошибка (CORS/офлайн)
      setError('Не вдалось зʼєднатися із сервером. Перевірте інтернет або дозвіл CORS.');
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Показываем подробную ошибку от сервера
      const errorMessage = Array.isArray(data?.detail)
        ? (data.detail as FastAPIError[]).map(err => err.msg).join('; ')
        : typeof data?.detail === 'string'
          ? data.detail
          : data?.msg || 'Сталася помилка. Спробуйте ще раз.';

      setError(errorMessage || 'Помилка авторизації');
      return;
    }

    if (activeTab === 'login') {
      if (data.access_token) {
        localStorage.setItem('allures_jwt', data.access_token);
      }
      setUser({
        id: data.id || 0,
        login: data.login,
        role: data.role,
        registered_at: data.registered_at,
        is_blocked: data.is_blocked ?? false
      });
    } else {
      // надішлемо код підтвердження (мʼяко, без зупинки флоу)
      try { await smartAuthFetch('/verify/request', { email: login }); } catch {}

      setUser({
        id: data.id,
        login: data.login,
        role: data.role,
        registered_at: data.registered_at,
        is_blocked: data.is_blocked
      });
    }

    setLogin('');
    setPassword('');
    if (activeTab === 'register') {
      setActiveTab('login');
      return;
    }
    router.push('/');
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
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={22}
                height={22}
                className={styles.googleIcon}
              />
            </button>
            <div className={styles.info}>
              <p>{`Увійшовши в систему, ви погоджуєтеся з 'Умовами…'`}</p>
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
            <p>{`Будь ласка, введіть адресу електронної пошти, пов'язану з вашим обліковим записом.`}</p>
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